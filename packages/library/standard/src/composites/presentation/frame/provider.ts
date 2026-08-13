import type { CompositeDependencyProvider } from '@retikz/core';

import { FrameDefinition } from './definition';

const makeFrameDefinition = () => FrameDefinition;

/** Frame 的 Core Composite dependency provider */
export const FrameProvider: CompositeDependencyProvider = Object.freeze({
  key: Object.freeze({ namespace: FrameDefinition.namespace, type: FrameDefinition.type }),
  dependencies: Object.freeze([]),
  datasets: Object.freeze({}),
  makeDefinition: makeFrameDefinition,
});
