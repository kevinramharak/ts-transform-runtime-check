import ts from 'typescript';

/**
 * 
 */
export function visitImportDeclaration(node: ts.ImportDeclaration, PACKAGE_NAME: string) {
    if (
        // typescript source code states:
        // > if `node.moduleSpecifier` is not a string literal it is an grammatical error
        !ts.isStringLiteral(node.moduleSpecifier) ||
        // `import <clause 'from'>? 'PACKAGE_NAME'`
        node.moduleSpecifier.text !== PACKAGE_NAME
    ) {
        return node;
    }

    // TODO: we could also actually implement the file with functions that throw when called
    //       this would solve the occasions that a developer does not use a compilation process with transforms enabled
    //       or if an imported function is assigned to some identifier and used as an alias

    // if its our package that is being imported drop the import node by returning void
    return;
}
