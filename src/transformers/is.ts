// allows us to see more of the internal TS api
import { } from 'ts-expose-internals';

import ts from 'typescript';
import { branch } from '@/util/branch';
import { IPackageOptions } from '@/config';
import { CreateShouldTransform } from './types';
import { assert, log, warn } from '@/util/log';

const ERROR = {
    InvalidAmountOfTypeArguments: `invalid amount of type arguments, expected exactly 1`,
    InvalidAmountOfArguments: `invalid amount of arguments, expected exactly 1`,
    InvalidTypeArgument: (name: string) => `invalid type argument '${name}'`,
    ImpossibleBranchReached: (reason: string) => `reached a branch that should be impossible to reach because of: '${reason}'`,
};

class NotImplemented extends Error {
    name = 'NotImplemented';
}

// https://tc39.es/ecma262/#sec-typeof-operator
export enum TypeOfResult {
    undefined = 'undefined',
    null = 'object',
    boolean = 'boolean',
    number = 'number',
    string = 'string',
    symbol = 'symbol',
    bigint = 'bigint',
    object = 'object',
    function = 'function',
}

/**
 * See: https://stackoverflow.com/questions/55056515/typescript-compiler-api-how-to-detect-if-property-type-is-enum-or-object
 */
export function isEnumType(type: ts.Type) {
    return type.symbol && type.symbol.valueDeclaration && type.symbol.valueDeclaration.kind === ts.SyntaxKind.EnumDeclaration;
}

/**
 * TODO: This makes the assumption of `Array` being the identifier for the global `Array` object and it having a method `isArray` that takes 1 argument
 */
export function createIsArrayCheck(context: ts.TransformationContext, node: ts.Expression) {
    return context.factory.createMethodCall(
        context.factory.createIdentifier('Array'),
        'isArray',
        [node]
    );
}

/**
 *
 */
export function createTypeOfCheck(context: ts.TransformationContext, value: ts.Expression, type: typeof TypeOfResult[keyof typeof TypeOfResult]) {
    return context.factory.createStrictEquality(
        context.factory.createTypeOfExpression(value),
        context.factory.createStringLiteral(type),
    );
}

function getUnknownType(checker: ts.TypeChecker) {
    // @ts-expect-error - using a hack to get the unreachable unknown type reference
    return checker.getTypeFromTypeNode({ kind: ts.SyntaxKind.UnknownKeyword, parent: { kind: ts.SyntaxKind.NotEmittedStatement } });
}

export function createTypeCheckGenerator(checker: ts.TypeChecker, context: ts.TransformationContext, options: IPackageOptions) {
    const compilerOptions = context.getCompilerOptions();
    // useful: https://github.com/microsoft/TypeScript/blob/master/src/compiler/types.ts#L4936
    // NOTE: it is (almost) guarenteed that integer indexes are sorted from 0 - n, so any TypeFlags with multiple flags can be impacted by this
    // NOTE: TypeFlags.EnumLiteral is always a & with StringLiteral | NumberLiteral
    // NOTE: TypeFlags.Enum is not actually used, Enum's seem to be represented as unions

    /**
     * References to intrinsic types, these are only to be passed to context.factory.* method, not to use for reference equality
     */
    const intrinsic = {
        any: checker.getAnyType(),
        null: checker.getNullType(),
        undefined: checker.getUndefinedType(),
        true: checker.getTrueType(),
        false: checker.getFalseType(),
        number: checker.getNumberType(),
        string: checker.getStringType(),
        void: checker.getVoidType(),
        optional: checker.getOptionalType(),
        boolean: checker.getBooleanType(),
        symbol: checker.getESSymbolType(),
        // NOTE: is not available like the above, need to find it in the catelog
        unknown: getUnknownType(checker),
    };

    const globals = compilerOptions.skipDefaultLibCheck ? {} : {};

    /**
     * generates the code for `is<{ is.type }>({ node.value }: { node.type })` CallExpressions
     */
    return function generateTypeCheckExpression(is: { type: ts.Type }, value: { node: ts.Expression, type?: ts.Type }): ts.Expression {
        const _value = { node: value.node, type: value.type || intrinsic.any };

        return branch(is.type.flags, {
            [ts.TypeFlags.Never]() {
                throw new Error(ERROR.InvalidTypeArgument(checker.typeToString(is.type)));
            },
            [ts.TypeFlags.Unknown | ts.TypeFlags.Any]() {
                return context.factory.createTrue();
            },
            [ts.TypeFlags.Null]() {
                return branch(_value.type.flags, {
                    [ts.TypeFlags.Null]() {
                        return context.factory.createTrue();
                    },
                    default() {
                        return context.factory.createStrictEquality(_value.node, context.factory.createNull());
                    },
                });
            },
            [ts.TypeFlags.Undefined]() {
                return branch(_value.type.flags, {
                    [ts.TypeFlags.Undefined | ts.TypeFlags.Void]() {
                        return context.factory.createTrue();
                    },
                    default() {
                        return context.factory.createStrictEquality(_value.node, context.factory.createVoidZero());
                    }
                });
            },
            [ts.TypeFlags.Void]() {
                // void van be null | undefined or undefined if strict null checks are on
                // see: https://www.typescriptlang.org/docs/handbook/basic-types.html#void
                return branch(_value.type.flags, {
                    [ts.TypeFlags.Undefined | ts.TypeFlags.Void]() {
                        return context.factory.createTrue();
                    },
                    [ts.TypeFlags.Null]() {
                        return (compilerOptions.strict || compilerOptions.strictNullChecks) ?
                            context.factory.createFalse() :
                            context.factory.createTrue();
                    },
                    default() {
                        return (compilerOptions.strict || compilerOptions.strictNullChecks) ?
                            context.factory.createStrictEquality(_value.node, context.factory.createVoidZero()) :
                            context.factory.createEquality(_value.node, context.factory.createNull());
                    }
                });
            },
            // NOTE: NonPrimitive is the plain `object` type
            // TODO: figure out if NonPrimitive is hit more than expected ,assumption is now that its the `object` type
            // see: https://www.typescriptlang.org/docs/handbook/basic-types.html#object
            [ts.TypeFlags.NonPrimitive]() {
                return branch(_value.type.flags, {
                    [ts.TypeFlags.NonPrimitive | ts.TypeFlags.Object]() {
                        return context.factory.createTrue();
                    },
                    [ts.TypeFlags.Any | ts.TypeFlags.Unknown]() {
                        const typeof_object = createTypeOfCheck(context, _value.node, TypeOfResult.object);
                        const strict_equality_null = context.factory.createStrictInequality(_value.node, context.factory.createNull());
                        const typeof_function = createTypeOfCheck(context, _value.node, TypeOfResult.function);

                        return context.factory.createLogicalOr(
                            context.factory.createParenthesizedExpression(
                                context.factory.createLogicalAnd(typeof_object, strict_equality_null)
                            ),
                            typeof_function
                        );
                    },
                    default() {
                        return context.factory.createFalse();
                    },
                });
            },
            [ts.TypeFlags.Boolean]() {
                return branch(_value.type.flags, {
                    [ts.TypeFlags.Boolean | ts.TypeFlags.BooleanLiteral]() {
                        return context.factory.createTrue();
                    },
                    [ts.TypeFlags.Any | ts.TypeFlags.Unknown]() {
                        return createTypeOfCheck(context, _value.node, TypeOfResult.boolean);
                    },
                    default() {
                        return context.factory.createFalse();
                    },
                });
            },
            [ts.TypeFlags.BooleanLiteral]() {
                return branch(_value.type.flags, {
                    [ts.TypeFlags.Boolean]() {
                        const literalValue = checker.typeToString(is.type) === 'true' ? context.factory.createTrue() : context.factory.createFalse();
                        return context.factory.createStrictEquality(_value.node, literalValue);
                    },
                    [ts.TypeFlags.BooleanLiteral]() {
                        const isEqual = checker.typeToString(is.type) === checker.typeToString(_value.type);
                        return isEqual ? context.factory.createTrue() : context.factory.createFalse();
                    },
                    [ts.TypeFlags.Any | ts.TypeFlags.Unknown]() {
                        const rhs = checker.typeToString(is.type) === 'true' ? context.factory.createTrue() : context.factory.createFalse();
                        return context.factory.createStrictEquality(_value.node, rhs);
                    },
                    default() {
                        return context.factory.createFalse();
                    },
                });
            },
            [ts.TypeFlags.ESSymbol]() {
                return branch(_value.type.flags, {
                    [ts.TypeFlags.ESSymbolLike]() {
                        return context.factory.createTrue();
                    },
                    [ts.TypeFlags.Any | ts.TypeFlags.Unknown]() {
                        return createTypeOfCheck(context, _value.node, TypeOfResult.symbol);
                    },
                    default() {
                        return context.factory.createFalse();
                    },
                });
            },
            [ts.TypeFlags.UniqueESSymbol]() {
                // TODO: implement this
                return branch(_value.type.flags, {
                    default() {
                        return context.factory.createFalse();
                    },
                });
            },
            [ts.TypeFlags.String]() {
                return branch(_value.type.flags, {
                    [ts.TypeFlags.StringLike]() {
                        return context.factory.createTrue();
                    },
                    [ts.TypeFlags.Any | ts.TypeFlags.Unknown]() {
                        return createTypeOfCheck(context, _value.node, TypeOfResult.string);
                    },
                    default() {
                        return context.factory.createFalse();
                    },
                });
            },
            [ts.TypeFlags.StringLiteral]() {
                return branch(_value.type.flags, {
                    [ts.TypeFlags.StringLike & ~ts.TypeFlags.StringLiteral]() {
                        const rhs = context.factory.createStringLiteral((is.type as ts.StringLiteralType).value);
                        return context.factory.createStrictEquality(_value.node, rhs);
                    },
                    [ts.TypeFlags.StringLiteral]() {
                        const isEqual = (is.type as ts.StringLiteralType).value === (_value.type as ts.StringLiteralType).value;
                        return isEqual ? context.factory.createTrue() : context.factory.createFalse();
                    },
                    [ts.TypeFlags.Any | ts.TypeFlags.Unknown]() {
                        const rhs = context.factory.createStringLiteral((is.type as ts.StringLiteralType).value);
                        return context.factory.createStrictEquality(_value.node, rhs);
                    },
                    default() {
                        return context.factory.createFalse();
                    },
                });
            },
            [ts.TypeFlags.Number]() {
                return branch(_value.type.flags, {
                    [ts.TypeFlags.NumberLike]() {
                        return context.factory.createTrue();
                    },
                    [ts.TypeFlags.Any | ts.TypeFlags.Unknown]() {
                        return createTypeOfCheck(context, _value.node, TypeOfResult.number);
                    },
                    default() {
                        return context.factory.createFalse();
                    },
                });
            },
            [ts.TypeFlags.NumberLiteral]() {
                return branch(_value.type.flags, {
                    [ts.TypeFlags.NumberLiteral]() {
                        const isEqual = (is.type as ts.NumberLiteralType).value === (_value.type as ts.NumberLiteralType).value;
                        return isEqual ? context.factory.createTrue() : context.factory.createFalse();
                    },
                    [ts.TypeFlags.Any | ts.TypeFlags.Unknown | ts.TypeFlags.NumberLike]() {
                        const rhs = context.factory.createNumericLiteral((is.type as ts.NumberLiteralType).value);
                        return context.factory.createStrictEquality(_value.node, rhs);
                    },
                    default() {
                        return context.factory.createFalse();
                    },
                });
            },
            [ts.TypeFlags.BigInt]() {
                return branch(_value.type.flags, {
                    [ts.TypeFlags.BigIntLike]() {
                        return context.factory.createTrue();
                    },
                    [ts.TypeFlags.Any | ts.TypeFlags.Unknown]() {
                        return createTypeOfCheck(context, _value.node, TypeOfResult.bigint);
                    },
                    default() {
                        return context.factory.createFalse();
                    },
                });
            },
            [ts.TypeFlags.BigIntLiteral]() {
                return branch(_value.type.flags, {
                    [ts.TypeFlags.BigIntLiteral]() {
                        const isEqual =
                            (is.type as ts.BigIntLiteralType).value.negative === (_value.type as ts.BigIntLiteralType).value.negative &&
                            (is.type as ts.BigIntLiteralType).value.base10Value === (_value.type as ts.BigIntLiteralType).value.base10Value;
                        return isEqual ? context.factory.createTrue() : context.factory.createFalse();
                    },
                    [ts.TypeFlags.Any | ts.TypeFlags.Unknown | ts.TypeFlags.BigIntLike]() {
                        const rhs = context.factory.createBigIntLiteral((is.type as ts.BigIntLiteralType).value);
                        return context.factory.createStrictEquality(_value.node, rhs);
                    },
                    default() {
                        return context.factory.createFalse();
                    },
                });
            },
            [ts.TypeFlags.Union]() {
                // TODO: do we need to care about const enum {} ?
                // NOTE: Enums are represented as unions at this level
                // TODO: in operator checks protoype chain, is that a problem?
                // see: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/in#inherited_properties
                if (isEnumType(is.type)) {
                    // Check if the value we are checking is a string | number
                    const is_string = createTypeOfCheck(context, _value.node, TypeOfResult.string);
                    const is_number = createTypeOfCheck(context, _value.node, TypeOfResult.number);
                    const is_index_type = context.factory.createParenthesizedExpression(
                        context.factory.createLogicalOr(is_string, is_number)
                    );
                    const is_in_enum = context.factory.createBinaryExpression(
                        _value.node,
                        ts.SyntaxKind.InKeyword,
                        context.factory.createIdentifier(is.type.symbol.name)
                    );
                    return context.factory.createLogicalAnd(is_index_type, is_in_enum);
                } else {
                    const types = (is.type as ts.UnionType).types;
                    return types.map(type => generateTypeCheckExpression({ type }, _value)).reduce((lhs, rhs) => {
                        return context.factory.createLogicalOr(lhs, rhs);
                    });
                }
            },
            [ts.TypeFlags.Intersection]() {
                const types = (is.type as ts.IntersectionType).types;
                return types.map(type => generateTypeCheckExpression({ type }, _value)).reduce((lhs, rhs) => {
                    return context.factory.createLogicalAnd(lhs, rhs);
                });
            },
            [ts.TypeFlags.Object]() {
                // TODO: add compile time evaluation for object types

                if (checker.isTupleType(is.type)) {
                    // TODO: should length be checked if so, how with rest/variadic?

                    const properties = checker.getPropertiesOfType(is.type);
                    const target = (is.type as ts.TupleTypeReference).target;

                    const is_array = createIsArrayCheck(context, _value.node);
                    const length_access = context.factory.createElementAccessExpression(_value.node, context.factory.createStringLiteral('length'));
                    // TODO: what is the difference between `minLength` and `fixedLength`?
                    const length = target.minLength; // target.hasRestElement ? target.minLength : target.fixedLength;
                    const length_literal = context.factory.createNumericLiteral(length);

                    // TODO: does this support all types of tuples? what about leading rest elements
                    const has_n_length = target.hasRestElement
                        ? context.factory.createGreaterThanEquals(length_access, length_literal)
                        : context.factory.createStrictEquality(length_access, length_literal);

                    // TODO: how to support variadic/rest tuples
                    return [
                        is_array, has_n_length,
                        ...(target.hasRestElement ? [] : properties.filter(property => {
                            const index = Number.parseInt(property.name);
                            if (Number.isNaN(index)) {
                                return false;
                            }
                            return index >= 0 && index < length;
                        }).map(property => {
                            const index = Number.parseInt(property.name);
                            const type = checker.getTypeOfSymbolAtLocation(property, _value.node);
                            const node = context.factory.createElementAccessExpression(_value.node, index);
                            return generateTypeCheckExpression({ type }, { node })
                        })),
                    ].reduce((lhs, rhs) => {
                        return context.factory.createLogicalAnd(lhs, rhs);
                    });
                } else if (checker.isArrayType(is.type)) {
                    const is_array = createIsArrayCheck(context, _value.node);
                    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                    const type = (is.type as ts.GenericType).typeArguments![0];
                    return branch(type.flags, {
                        [ts.TypeFlags.Any | ts.TypeFlags.Unknown]() {
                            return is_array;
                        },
                        default() {
                            const parameterIdentifier = context.factory.createIdentifier('item');
                            const check = generateTypeCheckExpression({ type }, { node: parameterIdentifier });
                            const parameterDeclaration = context.factory.createParameterDeclaration(void 0, void 0, void 0, parameterIdentifier);
                            const predicate = context.factory.createArrowFunction(void 0, void 0, [parameterDeclaration], void 0, void 0, check);
                            const rhs = context.factory.createMethodCall(_value.node, 'every', [predicate]);
                            return context.factory.createLogicalAnd(is_array, rhs);
                        }
                    });
                } else {
                    return branch(_value.type.flags, {
                        [ts.TypeFlags.Primitive]() {
                            return context.factory.createFalse();
                        },
                        default() {
                            let properties = checker.getPropertiesOfType(is.type);

                            const calls = checker.getSignaturesOfType(is.type, ts.SignatureKind.Call);
                            if (calls.length) {
                                // TODO: what to do with functions?
                            }

                            const news = checker.getSignaturesOfType(is.type, ts.SignatureKind.Construct);
                            if (news.length) {
                                // TODO: what to do with constructors?
                            }

                            if (options.ignoreInternal) {
                                properties = properties.filter((symbol) => {
                                    const hasInternalTag = symbol.getJsDocTags().find(tag => {
                                        return tag.name === 'internal';
                                    });
                                    return !hasInternalTag;
                                });
                            }

                            const checks = properties.length === 0 ? [context.factory.createTrue()] : properties.map((symbol) => {
                                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                                const type = checker.getTypeOfPropertyOfType(is.type, symbol.name)!;
                                const node = context.factory.createElementAccessExpression(_value.node, context.factory.createStringLiteral(symbol.name));
                                if ((type.flags & ts.TypeFlags.AnyOrUnknown) > 0) {
                                    log(type)
                                    warn(`${symbol.name} has type 'any | unknown'`);
                                }
                                return generateTypeCheckExpression({ type }, { node });
                            });

                            // property access requires a undefined | null check to prevent throwing a type error
                            // we only generate this check if we cannot infer if the type is not null or undefined
                            // see: https://tc39.es/ecma262/#sec-requireobjectcoercible
                            if ((_value.type.flags & (ts.TypeFlags.Any | ts.TypeFlags.Unknown)) !== 0) {
                                const allows_property_access = context.factory.createInequality(_value.node, context.factory.createNull());
                                checks.unshift(allows_property_access);
                            }

                            return checks.reduce((lhs, rhs) => {
                                return context.factory.createLogicalAnd(
                                    lhs,
                                    rhs,
                                );
                            });
                        },
                    });
                }
            },
            [ts.TypeFlags.TypeParameter]() {
                // TODO: specifybehaviour based on configuration

                const baseConstraintType = checker.getBaseConstraintOfType(is.type);

                if (baseConstraintType == null) {
                    throw new NotImplemented(`generic type check for requires a base type: ${checker.typeToString(is.type)}`);
                }

                // TODO: figure out how to use `<T extends BaseType = DefaultType>`
                return generateTypeCheckExpression({ type: baseConstraintType }, { node: _value.node });
            },
            default() {
                throw new NotImplemented(`missing type check for: ${checker.typeToString(is.type)}`);
            },
        });
    }
}

function shouldWrapInIIFE(node: ts.Expression): boolean {
    return ts.isAsExpression(node) ? shouldWrapInIIFE(node.expression) : (ts.isArrayLiteralExpression(node) || ts.isObjectLiteralExpression(node));
}

is.kind = ts.SyntaxKind.CallExpression;

/**
 * @param declaration the `is<T>(value: unknown): value is T` declaration
 */
is.createShouldTransform = function createShouldTransform(declaration: ts.Declaration) {
    return function shouldTransform(node, checker, context, options) {
        const signature = checker.getResolvedSignature(node);
        return signature && signature.declaration && signature.declaration === declaration;
    }
} as CreateShouldTransform<ts.CallExpression>;

const instances = new Map<[ts.TypeChecker, ts.TransformationContext, IPackageOptions], ReturnType<typeof createTypeCheckGenerator>>();

export function getTypeCheckGenerator(checker: ts.TypeChecker, context: ts.TransformationContext, options: IPackageOptions): ReturnType<typeof createTypeCheckGenerator> {
    for (const [[a, b, c], d] of instances) {
        if (checker ===  a && context === b && options === c) {
            return d;
        }
    }
    const i = createTypeCheckGenerator(checker, context, options);
    instances.set([checker, context, options], i);
    return i;
}

/**
 *
 */
export function is(node: ts.CallExpression, checker: ts.TypeChecker, context: ts.TransformationContext, options: IPackageOptions): ts.Expression {
    if (!node.typeArguments || node.typeArguments.length !== 1) {
        throw new Error(ERROR.InvalidAmountOfTypeArguments);
    }

    if (node.arguments.length !== 1) {
        throw new Error(ERROR.InvalidAmountOfArguments);
    }

    if (options.TypeScriptIs.shortCircuit) {
        return context.factory.createTrue();
    }

    const typeCheckGenerator = getTypeCheckGenerator(checker, context, options);

    // is<{is}>({value.node}: {value.type})
    const isNode = node.typeArguments[0];
    const isType = checker.getTypeFromTypeNode(isNode);

    let valueNode = node.arguments[0];
    const valueType = checker.getTypeAtLocation(valueNode);

    // TODO: put this behind a flag
    const wrapInIIFE = true && shouldWrapInIIFE(valueNode);
    const originalValueNode = valueNode;

    if (wrapInIIFE) {
        // when: `is<{ x: 2 }>({ x: 2 } as any);`
        // default: `(typeof { x: 2 } != null && { x: 2 }['x'] === 2);`
        // wrapped: `(literal => literal != null && literal['x'] === 2)({ x: 2 })`
        valueNode = context.factory.createIdentifier('literal');
    }


    let check = typeCheckGenerator({ type: isType }, { node: valueNode, type: valueType });

    if (options.addTypeComment) {
        ts.addSyntheticLeadingComment(check, ts.SyntaxKind.MultiLineCommentTrivia, ` ${checker.typeToString(isType)} `);
    }

    if (options.addParenthesis) {
        check = context.factory.createParenthesizedExpression(
            check,
        );
    }

    if (wrapInIIFE) {
        const parameterDeclaration = context.factory.createParameterDeclaration(void 0, void 0, void 0, valueNode as ts.Identifier);
        const arrowFunction = context.factory.createArrowFunction(void 0, void 0, [parameterDeclaration], void 0, void 0, check);
        check = context.factory.createCallExpression(arrowFunction, void 0, [originalValueNode]);
    }

    // TODO: maybe add an optional transformer that inlines `true` stuff?

    return check;
}
