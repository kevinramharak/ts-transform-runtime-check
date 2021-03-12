
import ts from 'typescript';
import { IPackageOptions } from '@/config';
export { CreateShouldTransform, ShouldTransform } from './types';

import { is } from './is';
import { createIs } from './createIs';

export type Transformer<TNode extends ts.Node = ts.Node> = (node: TNode, checker: ts.TypeChecker, context: ts.TransformationContext, options: IPackageOptions) => ts.Node;
export type MarkedTransformer<TNode extends ts.Node = ts.Node> = Transformer<TNode> & { kind: TNode['kind'] };

export const transformers = [
    is,
    createIs,
] as const;
