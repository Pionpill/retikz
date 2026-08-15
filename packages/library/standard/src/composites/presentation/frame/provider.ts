import type { CoreDependencyProvider } from '@retikz/core';

import { FrameDefinition } from './definition';

/** Frame 的 Core Composite dependency provider */
export const FrameProvider: CoreDependencyProvider = Object.freeze({
  key: Object.freeze({ capability: 'composite', namespace: FrameDefinition.namespace, type: FrameDefinition.type }),
  dependencies: Object.freeze([]),
  datasets: Object.freeze({}),
  makeDefinition: () => FrameDefinition,
});
