// allows us to see more of the internal TS api
import {} from 'ts-expose-internals';

import ts from 'typescript';
import { IPackageOptions } from '@/config';
import { CreateShouldTransform } from './types';
import { createTypeCheckGenerator } from './is';

const ERROR = {
    InvalidAmountOfTypeArguments: `invalid amount of type arguments, expected exactly 1`,
    InvalidTypeArgument: (name: string) => `invalid type argument '${name}'`,
    ImpossibleBranchReached: (reason: string) => `reached a branch that should be impossible to reach because of: '${reason}'`,
};

createIs.kind = ts.SyntaxKind.CallExpression;

/**
 * @param declaration the `createIs<T>() => (value: unknown): value is T` declaration
 */
createIs.createShouldTransform = function createShouldTransform(declaration: ts.Declaration) {
    return function shouldTransform(node, checker, context, options) {
        const signature = checker.getResolvedSignature(node);
        return signature && signature.declaration && signature.declaration === declaration;
    }
} as CreateShouldTransform<ts.CallExpression>;

/**
 * 
 */
export function createIs(node: ts.CallExpression, checker: ts.TypeChecker, context: ts.TransformationContext, options: IPackageOptions): ts.Expression {
    if (!node.typeArguments || node.typeArguments.length !== 1) {
        throw new Error(ERROR.InvalidAmountOfTypeArguments);
    }

    // createIs<{is}>()
    const isNode = node.typeArguments[0];
    const isType = checker.getTypeFromTypeNode(isNode);

    const parameterIdentifier = context.factory.createIdentifier('value');
    const generateTypeCheck = createTypeCheckGenerator(checker, context, options);
    const expression = generateTypeCheck({ type: isType }, { node: parameterIdentifier, type: checker.getAnyType() });
    const parameterDeclaration = context.factory.createParameterDeclaration(void 0, void 0, void 0, parameterIdentifier);

    return context.factory.createArrowFunction(void 0, void 0, [parameterDeclaration], void 0, void 0, expression);
}
