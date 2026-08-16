import type { EntityCreateOptions, IREntity } from './types';

import { GRAPH_NAMESPACE, GraphType } from '../shared';
import { EntitySchema } from './schema';

/** 校验并创建规范 Entity IR */
export const createEntity = (input: EntityCreateOptions): IREntity =>
  EntitySchema.parse({
    namespace: GRAPH_NAMESPACE,
    type: GraphType.Entity,
    ...input,
  });
