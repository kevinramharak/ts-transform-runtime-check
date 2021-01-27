// allows us to see more of the internal TS api
import {} from 'ts-expose-internals';

import ts from 'typescript';
import { branch } from '../branch';
import { ITransformerOptions } from '../transformer';
import { isEnumType } from './isEnumType';

const ERROR = {
    InvalidAmountOfTypeArguments: `invalid amount of type arguments, expected exactly 1`,
    InvalidAmountOfArguments: `invalid amount of arguments, expected exactly 1`,
    InvalidTypeArgument: (name: string) => `invalid type argument '${name}'`,
    ImpossibleBranchReached: (reason: string) => `reached a branch that should be impossible to reach because of: '${reason}'`,
};

const TypeOfValue = {
    BOOLEAN: 'boolean',
    NUMBER: 'number',
    BIGINT: 'bigint',
    STRING: 'string',
    SYMBOL: 'symbol',
    UNDEFINED: 'undefined',
    FUNCTION: 'function',
    OBJECT: 'object',
} as const;

function createTypeOfCheck(context: ts.TransformationContext, value: ts.Expression, type: typeof TypeOfValue[keyof typeof TypeOfValue]) {
    return context.factory.createStrictEquality(
        context.factory.createTypeOfExpression(value),
        context.factory.createStringLiteral(type),
    );
}

function createIsArrayCheck(context: ts.TransformationContext, node: ts.Expression) {
    return context.factory.createMethodCall(
        context.factory.createIdentifier('Array'),
        'isArray',
        [node]
    );
}

function createArrowFunction(context: ts.TransformationContext, parameters: (string | ts.Identifier | ts.ParameterDeclaration)[], body: ts.ConciseBody) {
    return context.factory.createArrowFunction(
        void 0, void 0,
        parameters.map(parameter => {
            if (typeof parameter === 'string' || parameter.kind === ts.SyntaxKind.Identifier) {
                return context.factory.createParameterDeclaration(void 0, void 0, void 0, parameter);
            }
            return parameter;
        }),
        void 0,
        void 0,
        body,
    );
}

function createTypeCheckGenerator(checker: ts.TypeChecker, context: ts.TransformationContext) {
    const compilerOptions = context.getCompilerOptions();
    // useful: https://github.com/microsoft/TypeScript/blob/master/src/compiler/types.ts#L4936
    // NOTE: it is (almost) guarenteed that integer indexes are sorted from 0 - n, so any TypeFlags with multiple flags will branch to the lowest bit set
    // NOTE: TypeFlags.EnumLiteral is always a & with StringLiteral | NumberLiteral
    // NOTE: TypeFlags.Enum is not actually used, Enums seems to be represented as unions
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
            // note: NonPrimitive is the plain `object` type
            // see: https://www.typescriptlang.org/docs/handbook/basic-types.html#object
            [ts.TypeFlags.NonPrimitive]() {
                return branch(value.type.flags, {
                    [ts.TypeFlags.NonPrimitive | ts.TypeFlags.Object]() {
                        return context.factory.createTrue();
                    },
                    [ts.TypeFlags.Any | ts.TypeFlags.Unknown]() {
                        const typeof_object = createTypeOfCheck(context, value.node, TypeOfValue.OBJECT);
                        const strict_equality_null = context.factory.createStrictInequality(value.node, context.factory.createNull());
                        const typeof_function = createTypeOfCheck(context, value.node, TypeOfValue.FUNCTION);

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
                        return createTypeOfCheck(context, value.node, TypeOfValue.BOOLEAN);
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
                        const rhs = (() => {
                            // see: https://github.com/microsoft/TypeScript/issues/42153
                            const typeAsString = checker.typeToString(is.type);
                            switch (typeAsString) {
                                case 'true': return context.factory.createTrue();
                                case 'false': return context.factory.createFalse();
                                default: throw new Error(ERROR.ImpossibleBranchReached('expected true or false, instead got ' + typeAsString))
                            }
                        })();
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
                        return createTypeOfCheck(context, value.node, TypeOfValue.SYMBOL);
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
                        return createTypeOfCheck(context, value.node, TypeOfValue.STRING);
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
                        return createTypeOfCheck(context, value.node, TypeOfValue.NUMBER);
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
                        return createTypeOfCheck(context, value.node, TypeOfValue.BIGINT);
                    },
                    default() {
                        return context.factory.createFalse();
                    },
                });
            },
            [ts.TypeFlags.BigIntLiteral]() {
                return branch(value.type.flags, {
                    [ts.TypeFlags.BigIntLiteral]() {
                        const isEqual = (is.type as ts.BigIntLiteralType).value === (value.type as ts.BigIntLiteralType).value;
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
                    const is_string = createTypeOfCheck(context, value.node, TypeOfValue.STRING);
                    const is_number = createTypeOfCheck(context, value.node, TypeOfValue.NUMBER);
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
                    const type = (is.type as ts.GenericType).typeArguments![0];
                    return branch(type.flags, {
                        [ts.TypeFlags.Any | ts.TypeFlags.Unknown]() {
                            return is_array;
                        },
                        default() {
                            const identifier = context.factory.createIdentifier('item');
                            const any = checker.getAnyType();
                            const check = generateTypeCheckExpression({ type }, { node: identifier, type: any });
                            const predicate = createArrowFunction(context, [identifier], check);
                            const rhs = context.factory.createMethodCall(value.node, 'every', [predicate]);
                            return context.factory.createLogicalAnd(is_array, rhs);
                        }
                    });
                } else {
                    return branch((is.type as ts.ObjectType).objectFlags, {
                        // see: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/isPrototypeOf
                        [ts.ObjectFlags.Class]() {
                            return branch(value.type.flags, {
                                [ts.TypeFlags.Primitive]() {
                                    return context.factory.createFalse();
                                },
                                default() {
                                    return context.factory.createBinaryExpression(
                                        value.node,
                                        ts.SyntaxKind.InstanceOfKeyword,
                                        context.factory.createIdentifier(is.type.symbol.name),
                                    );
                                }
                            });
                        },
                        [ts.ObjectFlags.Interface]() {
                            return branch(value.type.flags, {
                                [ts.TypeFlags.Primitive]() {
                                    return context.factory.createFalse();
                                },
                                default() {
                                    const members = (is.type as ts.InterfaceType).symbol.members;
                                    if (!members) {
                                        return context.factory.createTrue();
                                    }

                                    const checks =  Array.from(members as Map<ts.__String, ts.Symbol>).filter(([name, symbol]) => {
                                        return true;
                                    }).map(([name, symbol]) => {
                                        const type = checker.getTypeAtLocation(symbol.valueDeclaration);
                                        const node = context.factory.createElementAccessExpression(value.node, context.factory.createStringLiteral(name as string));
                                        const any = checker.getAnyType();
                                        return generateTypeCheckExpression({ type  }, { node, type: any });
                                    });
                                    
                                    // property access requires a undefined | null check to prevent throwing a type error
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
                            return value.node;
                        }
                    });
                }
            },
            default() {
                return value.node;
            },
        });
    }
}

// TODO: missing features
// - like<T>(value: any): typeof value quacks like T
// - createTypeCheck<T>(): (value: any ) => is<T>(value);
// - extends<A>(B: any): B extends A
// - ?<A>(value: B): A extends B
// - cache interface checks into an object? Share the cache with createTypeCheck
// - ignore @internal flagged properties
// - use json-schema's (at compile time and at runtime?)
// see https://github.com/vega/ts-json-schema-generator for example

/**
 * 
 */
export function is(options: ITransformerOptions) {
    function is(node: ts.CallExpression, checker: ts.TypeChecker, context: ts.TransformationContext): ts.Expression {
        if (!node.typeArguments || node.typeArguments.length !== 1) {
            throw new Error(ERROR.InvalidAmountOfTypeArguments);
        }

        if (node.arguments.length !== 1) {
            throw new Error(ERROR.InvalidAmountOfArguments);
        }

        const typeCheckGenerator = createTypeCheckGenerator(checker, context);

        // is<{is}>({value.nde}: {value.type})
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

    return is;
}
