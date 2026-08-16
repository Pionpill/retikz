import { parseWay } from '@retikz/core';

import type { IRRelation,RelationCreateOptions } from './types';

import { GRAPH_NAMESPACE, GraphType } from '../shared';
import { RelationSchema } from './schema';

/** 校验并创建规范 Relation IR */
export const createRelation = (input: RelationCreateOptions): IRRelation => {
  const { children, way, ...pathInput } = input;
  const hasChildren = children !== undefined;
  const hasWay = way !== undefined;
  if (hasChildren === hasWay) {
    throw new Error('Relation requires exactly one of `children` or `way`.');
  }

  if (way !== undefined) {
    return RelationSchema.parse({
      namespace: GRAPH_NAMESPACE,
      type: GraphType.Relation,
      ...pathInput,
      children: parseWay(way),
    });
  }

  return RelationSchema.parse({
    namespace: GRAPH_NAMESPACE,
    type: GraphType.Relation,
    ...pathInput,
    children,
  });
};
