import type { infer as ZodInfer } from 'zod';

import type { IRGraphRelation, RelationSchema } from '../../schemas';
import { GRAPH_NAMESPACE, GraphType } from '../../shared';

/** Relation 单 record 工厂的作者输入 */
export type RelationCreateOptions = Omit<ZodInfer<typeof RelationSchema>, 'namespace' | 'type'>;

/**
 * 组装 Graph root 使用的 Relation Source record
 * @param input 关系字段，不包含由工厂补齐的 namespace 和 type
 * @returns 新建的 Relation Source 记录；不解析 Schema、不生成 id，也不补齐主题默认值
 */
export const createRelation = (input: RelationCreateOptions): IRGraphRelation => ({
  namespace: GRAPH_NAMESPACE,
  type: GraphType.Relation,
  ...input,
});
