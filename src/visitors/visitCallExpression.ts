import ts from 'typescript';
import type { TransformerMap } from '../transformer';

export function visitCallExpresion(node: ts.CallExpression, checker: ts.TypeChecker, context: ts.TransformationContext, transformers: TransformerMap) {
    // `unknownSignature` will have no declaration property
    const signature = checker.getResolvedSignature(node, [], node.arguments.length);
    if (!signature || !signature.declaration) {
        return node;
    }

    // match the resolved function signature against our transformers
    const declaration = signature.declaration!;
    if (ts.isFunctionDeclaration(declaration)) {
        const transformer = transformers.get(declaration);
        if (transformer) {
            // if so return the transformed node
            return transformer(node, checker, context);
        }
    }

    // else return the node as is
    return node;
}
