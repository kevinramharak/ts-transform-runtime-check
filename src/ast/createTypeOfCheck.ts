
import ts from 'typescript';
import { TypeOfResult } from '../semantics';

/**
 * 
 */
export function createTypeOfCheck(context: ts.TransformationContext, value: ts.Expression, type: typeof TypeOfResult[keyof typeof TypeOfResult]) {
    return context.factory.createStrictEquality(
        context.factory.createTypeOfExpression(value),
        context.factory.createStringLiteral(type),
    );
}
