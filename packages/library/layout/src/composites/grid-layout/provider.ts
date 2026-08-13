import type { CompositeDependencyProvider } from '@retikz/core';

import { GridLayoutDefinition } from './definition';

const makeGridLayoutDefinition = () => GridLayoutDefinition;

/** GridLayout 的 Core Composite dependency provider */
export const GridLayoutProvider: CompositeDependencyProvider = Object.freeze({
  key: Object.freeze({ namespace: GridLayoutDefinition.namespace, type: GridLayoutDefinition.type }),
  dependencies: Object.freeze([]),
  datasets: Object.freeze({}),
  makeDefinition: makeGridLayoutDefinition,
});
