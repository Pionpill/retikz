import type { CompositeExpandResult, ExpandCompositeDefinition } from '@retikz/core';

import { defineComposite } from '@retikz/core';

import type { IRRelation } from './types';

import { GRAPH_NAMESPACE, GraphType } from '../shared';
import { RelationSchema } from './schema';

/** 将一个 Relation 规范 IR 展开为同标识的 Core 描边 Path */
const expandRelation = (relation: IRRelation): CompositeExpandResult => {
  const { namespace: _namespace, type: _type, role: _role, ...path } = relation;
  void _namespace;
  void _type;
  void _role;
  return { children: [{ type: 'path', ...path }] };
};

/** Relation 的轻量展开定义 */
export const RelationDefinition: ExpandCompositeDefinition<
  IRRelation,
  typeof GRAPH_NAMESPACE,
  typeof GraphType.Relation
> = defineComposite({
  namespace: GRAPH_NAMESPACE,
  type: GraphType.Relation,
  schema: RelationSchema,
  expand: expandRelation,
});
