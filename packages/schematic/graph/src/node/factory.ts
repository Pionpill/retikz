import type { GraphNodeCreateOptions, IRGraphNode } from './types';

import { GRAPH_NAMESPACE, GraphElementType } from '../shared';
import { GraphNodeSchema } from './schema';

/** 校验并创建规范 GraphNode IR */
export const createGraphNode = (input: GraphNodeCreateOptions): IRGraphNode =>
  GraphNodeSchema.parse({
    namespace: GRAPH_NAMESPACE,
    type: GraphElementType.GraphNode,
    ...input,
  });
