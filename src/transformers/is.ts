// allows us to see more of the internal TS api
import {} from 'ts-expose-internals';

import ts from 'typescript';
import { createArrowFunction, createIsArrayCheck, createTypeOfCheck, isEnumType } from '@/ast';
import { branch } from '@/branch';
import { IPackageOptions } from '@/config';
import { TypeOfResult } from '@/semantics';
import { CreateShouldTransform } from './types';
import { assert, log, warn } from '@/log';

const ERROR = {
    InvalidAmountOfTypeArguments: `invalid amount of type arguments, expected exactly 1`,
    InvalidAmountOfArguments: `invalid amount of arguments, expected exactly 1`,
    InvalidTypeArgument: (name: string) => `invalid type argument '${name}'`,
    ImpossibleBranchReached: (reason: string) => `reached a branch that should be impossible to reach because of: '${reason}'`,
};

class NotImplemented extends Error {
    name = 'NotImplemented';
}

export function createTypeCheckGenerator(checker: ts.TypeChecker, context: ts.TransformationContext) {
    const compilerOptions = context.getCompilerOptions();
    // useful: https://github.com/microsoft/TypeScript/blob/master/src/compiler/types.ts#L4936
    // NOTE: it is (almost) guarenteed that integer indexes are sorted from 0 - n, so any TypeFlags with multiple flags can be impacted by this
    // NOTE: TypeFlags.EnumLiteral is always a & with StringLiteral | NumberLiteral
    // NOTE: TypeFlags.Enum is not actually used, Enum's seem to be represented as unions
    /**
     * generates the code for `is<{ is.type }>({ node.value }: { node.type })` CallExpressions
     */
    return function generateTypeCheckExpression(is: { type: ts.Type }, value: { node: ts.Expression, type: ts.Type }): ts.Expression {
        return branch(is.type.flags, {
            [ts.TypeFlags.Never]() {
                throw new Error(ERROR.InvalidTypeArgument(checker.typeToString(is.type)));
            },
            [ts.TypeFlags.Unknown | ts.TypeFlags.Any]() {
                return context.factory.createTrue();
            },
            [ts.TypeFlags.Null]() {
                return branch(value.type.flags, {
                    [ts.TypeFlags.Null]() {
                        return context.factory.createTrue();
                    },
                    default() {
                        return context.factory.createStrictEquality(value.node, context.factory.createNull());
                    },
                });
            },
            [ts.TypeFlags.Undefined]() {
                return branch(value.type.flags, {
                    [ts.TypeFlags.Undefined | ts.TypeFlags.Void]() {
                        return context.factory.createTrue();
                    },
                    default() {
                        return context.factory.createStrictEquality(value.node, context.factory.createVoidZero());
                    }
                });
            },
            [ts.TypeFlags.Void]() {
                // void van be null | undefined or undefined if strict null checks are on
                // see: https://www.typescriptlang.org/docs/handbook/basic-types.html#void
                return branch(value.type.flags, {
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
                            context.factory.createStrictEquality(value.node, context.factory.createVoidZero()) :
                            context.factory.createEquality(value.node, context.factory.createNull());
                    }
                });
            },
            // NOTE: NonPrimitive is the plain `object` type
            // TODO: figure out if this messes with other types
            // see: https://www.typescriptlang.org/docs/handbook/basic-types.html#object
            [ts.TypeFlags.NonPrimitive]() {
                return branch(value.type.flags, {
                    [ts.TypeFlags.NonPrimitive | ts.TypeFlags.Object]() {
                        return context.factory.createTrue();
                    },
                    [ts.TypeFlags.Any | ts.TypeFlags.Unknown]() {
                        const typeof_object = createTypeOfCheck(context, value.node, TypeOfResult.object);
                        const strict_equality_null = context.factory.createStrictInequality(value.node, context.factory.createNull());
                        const typeof_function = createTypeOfCheck(context, value.node, TypeOfResult.function);

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
                return branch(value.type.flags, {
                    [ts.TypeFlags.BooleanLike]() {
                        return context.factory.createTrue();
                    },
                    default() {
                        return createTypeOfCheck(context, value.node, TypeOfResult.boolean);
                    },
                });
            },
            [ts.TypeFlags.BooleanLiteral]() {
                return branch(value.type.flags, {
                    [ts.TypeFlags.Boolean]() {
                        return context.factory.createTrue();
                    },
                    [ts.TypeFlags.BooleanLiteral]() {
                        const isEqual = is.type === value.type;
                        return isEqual ? context.factory.createTrue() : context.factory.createFalse();
                    },
                    [ts.TypeFlags.Any | ts.TypeFlags.Unknown]() {
                        const rhs = checker.getTrueType() === is.type ? context.factory.createTrue() : context.factory.createFalse();
                        return context.factory.createStrictEquality(value.node, rhs);
                    },
                    default() {
                        return context.factory.createFalse();
                    },
                });
            },
            [ts.TypeFlags.ESSymbol]() {
                return branch(value.type.flags, {
                    [ts.TypeFlags.ESSymbolLike]() {
                        return context.factory.createTrue();
                    },
                    [ts.TypeFlags.Any | ts.TypeFlags.Unknown]() {
                        return createTypeOfCheck(context, value.node, TypeOfResult.symbol);
                    },
                    default() {
                        return context.factory.createFalse();
                    },
                });
            },
            [ts.TypeFlags.UniqueESSymbol]() {
                // TODO: implement this
                return branch(value.type.flags, {
                    default() {
                        return context.factory.createFalse();
                    },
                });
            },
            [ts.TypeFlags.String]() {
                return branch(value.type.flags, {
                    [ts.TypeFlags.StringLike]() {
                        return context.factory.createTrue();
                    },
                    [ts.TypeFlags.Any | ts.TypeFlags.Unknown]() {
                        return createTypeOfCheck(context, value.node, TypeOfResult.string);
                    },
                    default() {
                        return context.factory.createFalse();
                    },
                });
            },
            [ts.TypeFlags.StringLiteral]() {
                return branch(value.type.flags, {
                    [ts.TypeFlags.StringLike & ~ts.TypeFlags.StringLiteral]() {
                        const rhs = context.factory.createStringLiteral((is.type as ts.StringLiteralType).value);
                        return context.factory.createStrictEquality(value.node, rhs);
                    },
                    [ts.TypeFlags.StringLiteral]() {
                        const isEqual = (is.type as ts.StringLiteralType).value === (value.type as ts.StringLiteralType).value;
                        return isEqual ? context.factory.createTrue() : context.factory.createFalse();
                    },
                    [ts.TypeFlags.Any | ts.TypeFlags.Unknown]() {
                        const rhs = context.factory.createStringLiteral((is.type as ts.StringLiteralType).value);
                        return context.factory.createStrictEquality(value.node, rhs);
                    },
                    default() {
                        return context.factory.createFalse();
                    },
                });
            },
            [ts.TypeFlags.Number]() {
                return branch(value.type.flags, {
                    [ts.TypeFlags.NumberLike]() {
                        return context.factory.createTrue();
                    },
                    [ts.TypeFlags.Any | ts.TypeFlags.Unknown]() {
                        return createTypeOfCheck(context, value.node, TypeOfResult.number);
                    },
                    default() {
                        return context.factory.createFalse();
                    },
                });
            },
            [ts.TypeFlags.NumberLiteral]() {
                return branch(value.type.flags, {
                    [ts.TypeFlags.NumberLiteral]() {
                        const isEqual = (is.type as ts.NumberLiteralType).value === (value.type as ts.NumberLiteralType).value;
                        return isEqual ? context.factory.createTrue() : context.factory.createFalse();
                    },
                    [ts.TypeFlags.Any | ts.TypeFlags.Unknown]() {
                        const rhs = context.factory.createNumericLiteral((is.type as ts.NumberLiteralType).value);
                        return context.factory.createStrictEquality(value.node, rhs);
                    },
                    default() {
                        return context.factory.createFalse();
                    },
                });
            },
            [ts.TypeFlags.BigInt]() {
                return branch(value.type.flags, {
                    [ts.TypeFlags.BigIntLike]() {
                        return context.factory.createTrue();
                    },
                    [ts.TypeFlags.Any | ts.TypeFlags.Unknown]() {
                        return createTypeOfCheck(context, value.node, TypeOfResult.bigint);
                    },
                    default() {
                        return context.factory.createFalse();
                    },
                });
            },
            [ts.TypeFlags.BigIntLiteral]() {
                return branch(value.type.flags, {
                    [ts.TypeFlags.BigIntLiteral]() {
                        const isEqual = 
                        (is.type as ts.BigIntLiteralType).value.negative === (value.type as ts.BigIntLiteralType).value.negative &&
                        (is.type as ts.BigIntLiteralType).value.base10Value === (value.type as ts.BigIntLiteralType).value.base10Value;
                        return isEqual ? context.factory.createTrue() : context.factory.createFalse();
                    },
                    [ts.TypeFlags.Any | ts.TypeFlags.Unknown]() {
                        const rhs = context.factory.createBigIntLiteral((is.type as ts.BigIntLiteralType).value);
                        return context.factory.createStrictEquality(value.node, rhs);
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
                    const is_string = createTypeOfCheck(context, value.node, TypeOfResult.string);
                    const is_number = createTypeOfCheck(context, value.node, TypeOfResult.number);
                    const is_index_type = context.factory.createParenthesizedExpression(
                        context.factory.createLogicalOr(is_string, is_number)
                    );
                    const is_in_enum = context.factory.createBinaryExpression(
                        value.node,
                        ts.SyntaxKind.InKeyword,
                        context.factory.createIdentifier(is.type.symbol.name)
                    );
                    return context.factory.createLogicalAnd(is_index_type, is_in_enum);
                } else {
                    const types = (is.type as ts.UnionType).types;
                    return types.map(type => generateTypeCheckExpression({ type }, value)).reduce((lhs, rhs) => {
                        return context.factory.createLogicalOr(lhs, rhs);
                    });
                }
            },
            [ts.TypeFlags.Intersection]() {
                const types = (is.type as ts.IntersectionType).types;
                return types.map(type => generateTypeCheckExpression({ type }, value)).reduce((lhs, rhs) => {
                    return context.factory.createLogicalAnd(lhs, rhs);
                });
            },
            [ts.TypeFlags.Object]() {
                // TODO: add compile time evaluation
                if (checker.isTupleType(is.type)) {
                    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                    const types = (is.type as ts.GenericType).typeArguments!;
                    const is_array = createIsArrayCheck(context, value.node);
                    const has_n_length = context.factory.createStrictEquality(
                        context.factory.createPropertyAccessExpression(value.node, 'length'),
                        context.factory.createNumericLiteral(types.length),
                    );
                    const any = checker.getAnyType();
                    return types.map((type, index) => {
                        const node = context.factory.createElementAccessExpression(value.node, index);
                        return generateTypeCheckExpression({ type }, { node, type: any });
                    }).reduce((lhs, rhs) => {
                        return context.factory.createLogicalAnd(lhs, rhs);
                    }, context.factory.createLogicalAnd(
                        is_array,
                        has_n_length,
                    ));
                } else if (checker.isArrayType(is.type)) {
                    const is_array = createIsArrayCheck(context, value.node);
                    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                    const type = (is.type as ts.GenericType).typeArguments![0];
                    return branch(type.flags, {
                        [ts.TypeFlags.Any | ts.TypeFlags.Unknown]() {
                            return is_array;
                        },
                        default() {
                            const identifier = context.factory.createIdentifier('item');
                            const any = checker.getAnyType();
                            const check = generateTypeCheckExpression({ type }, { node: identifier, type: any });
                            const predicate = createArrowFunction(context, void 0, [identifier], check);
                            const rhs = context.factory.createMethodCall(value.node, 'every', [predicate]);
                            return context.factory.createLogicalAnd(is_array, rhs);
                        }
                    });
                } else {
                    return branch((is.type as ts.ObjectType).objectFlags, {
                        [ts.ObjectFlags.Class]() {
                            // TODO: config.flag to enable/disable using class types as interfaces
                            // eslint-disable-next-line no-constant-condition
                            if (true) {
                                return this[ts.ObjectFlags.Interface]();
                            }
                        },
                        // TODO: write tests for each of these flags
                        [ts.ObjectFlags.Interface | ts.ObjectFlags.Anonymous | ts.ObjectFlags.Reference | ts.ObjectFlags.Instantiated]() {
                            return branch(value.type.flags, {
                                [ts.TypeFlags.Primitive]() {
                                    return context.factory.createFalse();
                                },
                                default() {
                                    const properties = checker.getPropertiesOfType(is.type);
                                    const checks =  properties.map((symbol) => {
                                        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                                        const type = checker.getTypeOfPropertyOfType(is.type, symbol.name)!;
                                        const node = context.factory.createElementAccessExpression(value.node, context.factory.createStringLiteral(symbol.name));
                                        const any = checker.getAnyType();
                                        if ((type.flags & ts.TypeFlags.AnyOrUnknown) > 0) {
                                            log(type)
                                            warn(`${symbol.name} has type 'any | unknown'`);
                                        }
                                        return generateTypeCheckExpression({ type }, { node, type: any });
                                    });
                                    
                                    // property access requires a undefined | null check to prevent throwing a type error
                                    // we only generate this check if we cannot infer if the type is not null or undefined
                                    // see: https://tc39.es/ecma262/#sec-requireobjectcoercible
                                    if ((value.type.flags & (ts.TypeFlags.Any | ts.TypeFlags.Unknown)) !== 0) {
                                        const allows_property_access = context.factory.createInequality(value.node, context.factory.createNull());
                                        checks.unshift(allows_property_access);
                                    }

                                    return checks.reduce((lhs, rhs) => {
                                        return context.factory.createLogicalAnd(
                                            lhs,
                                            rhs,
                                        );
                                    });
                                }
                            });
                        },
                        default() {
                            throw new NotImplemented(checker.typeToString(is.type));
                        },
                    });
                }
            },
            [ts.TypeFlags.TypeParameter]() {
                // TODO: specifybehaviour based on configuration

                const baseConstraintType = checker.getBaseConstraintOfType(is.type);
                assert(baseConstraintType != null, 'asserts baseTypes != null');

                // TODO: figure out how to use `<T extends BaseType = DefaultType>`
                const any = checker.getAnyType();
                return generateTypeCheckExpression({ type: baseConstraintType }, { node: value.node, type: any });
            },
            default() {
                throw new NotImplemented(`missing type check for: ${checker.typeToString(is.type)}`);
            },
        });
    }
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

    const typeCheckGenerator = createTypeCheckGenerator(checker, context);

    // is<{is}>({value.node}: {value.type})
    const isNode = node.typeArguments[0];
    const isType = checker.getTypeFromTypeNode(isNode);

    const valueNode = node.arguments[0];
    const valueType = checker.getTypeAtLocation(valueNode);

    let check = typeCheckGenerator({ type: isType }, { node: valueNode, type: valueType });

    if (options.addTypeComment) {
        ts.addSyntheticLeadingComment(check, ts.SyntaxKind.MultiLineCommentTrivia, ` ${checker.typeToString(isType)} `);
    }

    if (options.addParenthesis) {
        check = context.factory.createParenthesizedExpression(
            check,
        );
    }

    return check;
}
