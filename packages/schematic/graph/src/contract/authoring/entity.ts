import type { infer as ZodInfer } from 'zod';

import type { EntitySchema, IRGraphEntity } from '../../schemas';
import { GRAPH_NAMESPACE, GraphType } from '../../shared';

/** Entity 单 record 工厂的作者输入 */
export type EntityCreateOptions = Omit<ZodInfer<typeof EntitySchema>, 'namespace' | 'type'>;

/**
 * 组装 Graph root 使用的 Entity Source record
 * @param input 实体字段，不包含由工厂补齐的 namespace 和 type
 * @returns 新建的 Entity Source 记录；不解析 Schema、不生成 id，也不补齐位置或主题默认值
 */
export const createEntity = (input: EntityCreateOptions): IRGraphEntity => ({
  namespace: GRAPH_NAMESPACE,
  type: GraphType.Entity,
  ...input,
});
