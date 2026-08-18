import type { z } from 'zod';

import type { IRContainer } from '../../schemas';

import { ContainerSchema } from '../../schemas';
import { GRAPH_NAMESPACE, GraphType } from '../../shared';

/** Container 工厂输入 */
export type ContainerCreateOptions = Omit<z.input<typeof ContainerSchema>, 'namespace' | 'type'>;

/** 校验并创建规范 Container IR */
export const createContainer = (input: ContainerCreateOptions): IRContainer =>
  ContainerSchema.parse({
    namespace: GRAPH_NAMESPACE,
    type: GraphType.Container,
    ...input,
  });
