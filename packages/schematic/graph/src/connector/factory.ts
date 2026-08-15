import { parseWay } from '@retikz/core';

import type { GraphConnectorCreateOptions, IRGraphConnector } from './types';

import { GRAPH_NAMESPACE, GraphElementType } from '../shared';
import { GraphConnectorSchema } from './schema';

/** 校验并创建规范 GraphConnector IR */
export const createGraphConnector = (input: GraphConnectorCreateOptions): IRGraphConnector => {
  const { children, way, ...pathInput } = input;
  const hasChildren = children !== undefined;
  const hasWay = way !== undefined;
  if (hasChildren === hasWay) {
    throw new Error('GraphConnector requires exactly one of `children` or `way`.');
  }

  if (way !== undefined) {
    return GraphConnectorSchema.parse({
      namespace: GRAPH_NAMESPACE,
      type: GraphElementType.GraphConnector,
      ...pathInput,
      children: parseWay(way),
    });
  }

  return GraphConnectorSchema.parse({
    namespace: GRAPH_NAMESPACE,
    type: GraphElementType.GraphConnector,
    ...pathInput,
    children,
  });
};
