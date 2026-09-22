import type { CoreDependencyProvider } from '@retikz/core';

import { GridDefinition } from './definition';

/** Grid 的 Core Composite dependency provider */
export const GridProvider: CoreDependencyProvider = Object.freeze({
  key: Object.freeze({ capability: 'composite', namespace: GridDefinition.namespace, type: GridDefinition.type }),
  dependencies: Object.freeze([]),
  datasets: Object.freeze({}),
  makeDefinition: () => GridDefinition,
});
