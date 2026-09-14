import type { infer as ZodInfer } from 'zod';

import type { IRGraphRelation, RelationSchema } from '../../schemas';

import { GRAPH_NAMESPACE, GraphType } from '../../shared';

/** Relation 单 record 工厂的作者输入 */
export type RelationCreateOptions = Omit<ZodInfer<typeof RelationSchema>, 'namespace' | 'type'>;

/** 组装 Graph root 使用的 Relation Source record */
export const createRelation = (input: RelationCreateOptions): IRGraphRelation => ({
  namespace: GRAPH_NAMESPACE,
  type: GraphType.Relation,
  ...input,
});
