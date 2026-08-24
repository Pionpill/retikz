import type { input as ZodInput } from 'zod';

import type { IRGraphRelation, RelationSchema } from '../../schemas';

import { RelationSchema as RelationIRSchema } from '../../schemas';
import { GRAPH_NAMESPACE, GraphType } from '../../shared';

/** Relation 单 record 工厂的作者输入 */
export type RelationCreateOptions = Omit<ZodInput<typeof RelationSchema>, 'namespace' | 'type'>;

/** 校验并创建 Graph root 使用的 Relation Source record */
export const createRelation = (input: RelationCreateOptions): IRGraphRelation =>
  RelationIRSchema.parse({
    namespace: GRAPH_NAMESPACE,
    type: GraphType.Relation,
    ...input,
  });
