import ts from 'typescript';

type ParameterLike = string | ts.Identifier | ts.ParameterDeclaration;

/**
 * 
 */
export function createArrowFunction(context: ts.TransformationContext, parameters: ParameterLike[], body: ts.ConciseBody) {
    const params = parameters.map(parameter => {
        if (typeof parameter === 'string' || parameter.kind === ts.SyntaxKind.Identifier) {
            return context.factory.createParameterDeclaration(
                /** decoratrs */ void 0,
                /** modifiers */ void 0,
                /** dotDotDotToken */ void 0,
                parameter,
            );
        }
        return parameter;
    });
    return context.factory.createArrowFunction(
        /** modifiers */ void 0,
        /** typeParameters */ void 0,
        params,
        /** type */ void 0,
        /** equalsGreaterThanToken */ void 0,
        body,
    );
}
