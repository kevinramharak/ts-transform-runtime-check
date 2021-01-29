import ts from 'typescript';

/**
 * See: https://stackoverflow.com/questions/55056515/typescript-compiler-api-how-to-detect-if-property-type-is-enum-or-object
 */
export function isEnumType(type: ts.Type) {
    return type.symbol && type.symbol.valueDeclaration && type.symbol.valueDeclaration.kind === ts.SyntaxKind.EnumDeclaration;
}
