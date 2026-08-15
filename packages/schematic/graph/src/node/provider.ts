import type { CoreDependencyProvider } from '@retikz/core';

import { GraphNodeDefinition } from './definition';

/** GraphNode 的 Core Composite dependency provider */
export const GraphNodeProvider: CoreDependencyProvider = Object.freeze({
  key: Object.freeze({
    capability: 'composite',
    namespace: GraphNodeDefinition.namespace,
    type: GraphNodeDefinition.type,
  }),
  dependencies: Object.freeze([]),
  datasets: Object.freeze({}),
  makeDefinition: () => GraphNodeDefinition,
});

/** 创建 GraphNode provider 集合 */
export const createGraphNodeProviders = (): ReadonlyArray<CoreDependencyProvider> =>
  Object.freeze([GraphNodeProvider]);
