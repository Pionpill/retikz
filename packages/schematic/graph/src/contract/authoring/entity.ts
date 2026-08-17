import type { z } from 'zod';

import type { EntitySchema, IREntity } from '../../schemas';

import { EntitySchema as EntityIRSchema } from '../../schemas';
import { GRAPH_NAMESPACE, GraphType } from '../../shared';

/** Entity factory 的作者输入 */
export type EntityCreateOptions = Omit<z.input<typeof EntitySchema>, 'namespace' | 'type'>;

/** 校验并创建规范 Entity IR */
export const createEntity = (input: EntityCreateOptions): IREntity =>
  EntityIRSchema.parse({
    namespace: GRAPH_NAMESPACE,
    type: GraphType.Entity,
    ...input,
  });
