
import ts from 'typescript';
import { IPackageOptions } from '../config';
import { visitImportDeclaration } from './visitImportDeclaration';

export type Visitor<TNode extends ts.Node = ts.Node> = (node: TNode, checker: ts.TypeChecker, context: ts.TransformationContext, options: IPackageOptions) => ts.Node | undefined;
export type MarkedVisitor<TNode extends ts.Node = ts.Node> = Visitor<TNode> & { kind: TNode['kind'] };

export const visitors = [
    visitImportDeclaration,
] as const;
