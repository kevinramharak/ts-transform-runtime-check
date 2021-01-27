import ts from 'typescript';

/**
 * checks import declarations to see if it is an import of this package, if so it checks if the node should be discarded
 */
export function visitImportDeclaration(node: ts.ImportDeclaration, PACKAGE_NAME: string) {
    // if `node.moduleSpecifier` is not a string literal it is an grammar error so return and let someone else deal with that
    if (!ts.isStringLiteral(node.moduleSpecifier)) {
        return node;
    }

    // not our import so don't touch it
    if (node.moduleSpecifier.text !== PACKAGE_NAME) {
        return node;
    }

    // a side-effect import, which is probably a mistake but don't touch it and let the developer figure it out
    if (!node.importClause) {
        // TODO: maybe tell the developer he's being a dummy?
        return node;
    }

    // its a type only import, no harm in returning the node as it will be stripped out anyway
    if (node.importClause.isTypeOnly) {
        return node;
    }

    // figure out what is imported
    const { name, namedBindings: bindings } = node.importClause;

    // default import means either some code is trying to use it as a namespace or the transformer api is being used
    if (name) {
        // TODO: see if we can figure out how the import is being used
        return node;
    }

    // bindings can always be dropped as we will not expose any actual code besides the default export (yet)
    if (bindings) {
        return;
    }

    // TODO: check export declarations to see if someone is trying something stupid

    // unreachable code, default to not discard the import
    return node;
}
