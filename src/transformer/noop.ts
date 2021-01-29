import ts from 'typescript';

export function noopNodeVisitor(node: ts.Node) {
    return node;
}

function noopSourceFileVisitor(file: ts.SourceFile) {
    return ts.visitNode(file, noopNodeVisitor);
}

export function noopContextTransformer() {
    return noopSourceFileVisitor;
}
