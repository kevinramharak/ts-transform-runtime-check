import ts from 'typescript';
import { TransformerMap } from '../transformer';

export function visitPropertyAssignment(node: ts.PropertyAssignment, checker: ts.TypeChecker, context: ts.TransformationContext, transformers: TransformerMap) {
    const type = checker.getTypeAtLocation(node.initializer);
    const declaration = type.symbol.valueDeclaration;
    if (ts.isFunctionDeclaration(declaration) && transformers.has(declaration)) {
        const body = context.factory.createBlock([]);
        const noop = context.factory.createFunctionExpression(void 0, void 0, void 0, [], [], void 0, body);
        // TODO: decide to throw or warn the user
        return context.factory.createPropertyAssignment(node.name, noop);
    }
    return node;
}
