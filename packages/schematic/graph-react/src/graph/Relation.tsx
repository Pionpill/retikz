import type { RelationCreateOptions } from '@retikz/graph';
import type { InputRelation } from '@retikz/graph-vanilla';
import type { ReactInputEmbedContext } from '@retikz/react';
import type { FC, ReactNode } from 'react';

import { RelationInputEmbedAdapter } from '@retikz/graph-vanilla';
import { withInputEmbedAdapters } from '@retikz/react';

import type { GraphEmbeddableComponent } from '../shared';

import { RetikzGraphReactError, RetikzGraphReactErrorCode } from '../errors';
import { collectRelationPath, hasAuthoringChildren } from './authoring';

type RelationBaseProps = Omit<RelationCreateOptions, 'children' | 'way'>;
type RelationWay = Exclude<RelationCreateOptions['way'], undefined>;

/** Relation 的 React 编写参数，两套作者语法必须且只能选择一套 */
export type RelationProps = RelationBaseProps &
  Readonly<{ children?: ReactNode; way?: never } | { children?: never; way: RelationWay }>;

/** 将 Relation 的 React children 或 way 组装为 Graph Vanilla Input */
const createRelationInput = (props: Readonly<Record<string, unknown>>, context: ReactInputEmbedContext) => {
  const { id: _id, children, way, ...pathInput } = props as RelationProps;
  void _id;
  const hasChildren = hasAuthoringChildren(children);
  if (hasChildren && way !== undefined) {
    throw new RetikzGraphReactError({
      code: RetikzGraphReactErrorCode.RelationInputInvalid,
      message: 'Relation requires exactly one of `children` or `way`.',
      details: { label: 'Relation', reason: 'children-and-way-conflict' },
    });
  }
  if (!hasChildren) return { ...pathInput, way: way as RelationWay } satisfies InputRelation;
  const collected = collectRelationPath(children, context.id);
  return withInputEmbedAdapters(
    { ...pathInput, authoringPath: collected.child } satisfies InputRelation,
    collected.adapters,
  );
};

const RelationComponent: FC<RelationProps> = () => null;

/** 将 Relation 接入 React 编写流程的组件 */
export const Relation = RelationComponent as GraphEmbeddableComponent<RelationProps>;

Relation.displayName = 'Relation';
Relation.isTier2Embeddable = true;
Relation.inputEmbedAdapter = RelationInputEmbedAdapter;
Relation.createInputEmbedProps = createRelationInput;
