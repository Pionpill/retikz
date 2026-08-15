import type { CoreDependencyProvider } from '@retikz/core';

import { GraphFrameDefinition } from './definition';

const makeGraphFrameDefinition = () => GraphFrameDefinition;

/** GraphFrame 的 Core Composite dependency provider */
export const GraphFrameProvider: CoreDependencyProvider = Object.freeze({
  key: Object.freeze({ capability: 'composite', namespace: GraphFrameDefinition.namespace, type: GraphFrameDefinition.type }),
  dependencies: Object.freeze([]),
  datasets: Object.freeze({}),
  makeDefinition: makeGraphFrameDefinition,
});
