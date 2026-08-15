import type { GraphFrameCreateOptions,IRGraphFrame } from './types';

import { GRAPH_NAMESPACE } from '../../shared';
import { GraphFrameSchema } from './schema';

/** 校验并创建规范 GraphFrame IR */
export const createGraphFrame = (input: GraphFrameCreateOptions): IRGraphFrame =>
  GraphFrameSchema.parse({
    namespace: GRAPH_NAMESPACE,
    type: 'graphFrame',
    ...input,
  });
