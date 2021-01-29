import ts from 'typescript';

/**
 * NOTE: This makes the assumption of `Array` being the identifier for the global `Array` object and it having a method `isArray` that takes 1 argument
 */
export function createIsArrayCheck(context: ts.TransformationContext, node: ts.Expression) {
    return context.factory.createMethodCall(
        context.factory.createIdentifier('Array'),
        'isArray',
        [node]
    );
}
