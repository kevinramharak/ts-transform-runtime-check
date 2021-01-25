
import ts from 'typescript';
import { TransformerMap } from '../transformer';

export function visitPropertyDeclaration(node: ts.PropertyDeclaration, checker: ts.TypeChecker, context: ts.TransformationContext, transformers: TransformerMap) {
    if (node.initializer) {
        const type = checker.getTypeAtLocation(node.initializer);
        const declaration = type.symbol.valueDeclaration;
        if (ts.isFunctionDeclaration(declaration) && transformers.has(declaration)) {
            const body = context.factory.createBlock([]);
            const noop = context.factory.createFunctionExpression(void 0, void 0, void 0, void 0, void 0, void 0, body);
            // TODO: decide to throw or warn the user
            return context.factory.createPropertyDeclaration(void 0, void 0, node.name, void 0, void 0, noop);
        }
    }
    return node;
}

