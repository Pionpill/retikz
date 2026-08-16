import type { WayDSL } from '@retikz/core';
import type { z } from 'zod';

import { parseWay } from '@retikz/core';

import type { IRRelation, RelationSchema } from '../../schemas';

import { RelationSchema as RelationIRSchema } from '../../schemas';
import { GRAPH_NAMESPACE, GraphType } from '../../shared';

type RelationCreateOptionsBase = Omit<z.input<typeof RelationSchema>, 'namespace' | 'type' | 'children'>;

/** 使用规范 Core Step 编写 Relation 的作者输入 */
export type RelationChildrenCreateOptions = RelationCreateOptionsBase & {
  children: z.input<typeof RelationSchema>['children'];
  way?: never;
};

/** 使用 Core Draw way 语法编写 Relation 的作者输入 */
export type RelationWayCreateOptions = RelationCreateOptionsBase & {
  children?: never;
  way: WayDSL;
};

/** Relation 工厂输入，两套作者语法必须且只能选择一套 */
export type RelationCreateOptions = RelationChildrenCreateOptions | RelationWayCreateOptions;

/** 校验并创建规范 Relation IR */
export const createRelation = (input: RelationCreateOptions): IRRelation => {
  const { children, way, ...pathInput } = input;
  const hasChildren = children !== undefined;
  const hasWay = way !== undefined;
  if (hasChildren === hasWay) {
    throw new Error('Relation requires exactly one of `children` or `way`.');
  }

  return RelationIRSchema.parse({
    namespace: GRAPH_NAMESPACE,
    type: GraphType.Relation,
    ...pathInput,
    children: way !== undefined ? parseWay(way) : children,
  });
};
