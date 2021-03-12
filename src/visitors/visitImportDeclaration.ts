import ts from 'typescript';
import { IPackageOptions } from '@/config';

visitImportDeclaration.kind = ts.SyntaxKind.ImportDeclaration;

/**
 * checks import declarations to see if it is an import with `PACKAGE_MODULE_SPECIFIER` as module specifier and drops it if it is
 */
export function visitImportDeclaration(node: ts.ImportDeclaration, checker: ts.TypeChecker, context: ts.TransformationContext, options: IPackageOptions) {
    // if `node.moduleSpecifier` is not a string literal it is an grammar error so return and let the compiler figure it ut
    if (!ts.isStringLiteral(node.moduleSpecifier)) {
        return node;
    }

    // not our import
    if (node.moduleSpecifier.text !== options.PackageModuleName) {
        return node;
    }

    return;
}
