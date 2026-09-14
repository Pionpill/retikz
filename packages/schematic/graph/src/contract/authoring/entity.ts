import type { infer as ZodInfer } from 'zod';

import type { EntitySchema, IRGraphEntity } from '../../schemas';
import { GRAPH_NAMESPACE, GraphType } from '../../shared';

/** Entity 单 record 工厂的作者输入 */
export type EntityCreateOptions = Omit<ZodInfer<typeof EntitySchema>, 'namespace' | 'type'>;

/** 组装 Graph root 使用的 Entity Source record */
export const createEntity = (input: EntityCreateOptions): IRGraphEntity => ({
  namespace: GRAPH_NAMESPACE,
  type: GraphType.Entity,
  ...input,
});
