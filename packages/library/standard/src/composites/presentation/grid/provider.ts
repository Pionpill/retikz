import type { CompositeDependencyProvider } from '@retikz/core';

import { GridDefinition } from './definition';

const makeGridDefinition = () => GridDefinition;

/** Grid 的 Core Composite dependency provider */
export const GridProvider: CompositeDependencyProvider = Object.freeze({
  key: Object.freeze({ namespace: GridDefinition.namespace, type: GridDefinition.type }),
  dependencies: Object.freeze([]),
  datasets: Object.freeze({}),
  makeDefinition: makeGridDefinition,
});
