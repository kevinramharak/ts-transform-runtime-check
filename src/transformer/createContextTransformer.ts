import ts from 'typescript';
import { IPackageOptions, IPublicPackageOptions } from '../config';
import { MarkedTransformer, ShouldTransform } from '../transformers';
import { MarkedVisitor, visitors } from '../visitors';

// TODO: is recursion needed/possible?
/**
 * The difference between a visitor and a transformer is that a visitor will always visit its kind and return.
 * while transformers have a conditional before they execute.
 * for this reason transformers are asked first if they are interested in a node
 * then the visitors are executed
 */
export function createNodeVisitor(visitors: MarkedVisitor[], transformers: [ShouldTransform, MarkedTransformer][], checker: ts.TypeChecker, context: ts.TransformationContext, options: IPackageOptions) {
    return function nodeVisitor(node: ts.Node): ts.Node | undefined {
        const [_, transformer] = transformers.find(([shouldTransform, transformer]) => transformer.kind === node.kind && shouldTransform(node, checker, context, options)) || [];
        if (transformer) {
            return transformer(node, checker, context, options);
        }
        const visitor = visitors.find(visitor => visitor.kind === node.kind);
        if (visitor) {
            return visitor(node, checker, context, options);
        }
        return ts.visitEachChild(node, nodeVisitor, context);
    }
}

export function createContextTransformer(checker: ts.TypeChecker, transformers: [ShouldTransform, MarkedTransformer][], options: IPublicPackageOptions) {
    return function contextTransformer(context: ts.TransformationContext) {
        const visitor = createNodeVisitor(visitors as unknown as MarkedVisitor[], transformers, checker, context, options as IPackageOptions);
        return function sourceFileVisitor(file: ts.SourceFile) {
            return ts.visitNode(file, visitor);
        }
    }
}
