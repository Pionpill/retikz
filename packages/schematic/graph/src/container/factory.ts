import type { ContainerCreateOptions, IRContainer } from './types';

import { GRAPH_NAMESPACE, GraphType } from '../shared';
import { ContainerSchema } from './schema';

/** 校验并创建规范 Container IR */
export const createContainer = (input: ContainerCreateOptions): IRContainer =>
  ContainerSchema.parse({
    namespace: GRAPH_NAMESPACE,
    type: GraphType.Container,
    ...input,
  });
