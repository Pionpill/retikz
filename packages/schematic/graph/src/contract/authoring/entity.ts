import type { z } from 'zod';

import type { EntitySchema, IRGraphEntity } from '../../schemas';

import { EntitySchema as EntityIRSchema } from '../../schemas';
import { GRAPH_NAMESPACE, GraphType } from '../../shared';

/** Entity 单 record 工厂的作者输入 */
export type EntityCreateOptions = Omit<z.input<typeof EntitySchema>, 'namespace' | 'type'>;

/** 校验并创建 Graph root 使用的 Entity Source record */
export const createEntity = (input: EntityCreateOptions): IRGraphEntity =>
  EntityIRSchema.parse({
    namespace: GRAPH_NAMESPACE,
    type: GraphType.Entity,
    ...input,
  });
