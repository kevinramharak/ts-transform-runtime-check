import ts from 'typescript';
import { IPackageOptions } from '../config';

export type ShouldTransform<TNode extends ts.Node = ts.Node> = (
    node: TNode,
    checker: ts.TypeChecker,
    context: ts.TransformationContext,
    options: IPackageOptions,
) => boolean;

export type CreateShouldTransform<TNode extends ts.Node> = (declaration: ts.Declaration) => ShouldTransform<TNode>;
