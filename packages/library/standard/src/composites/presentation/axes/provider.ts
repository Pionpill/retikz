import type { CompositeDependencyProvider } from '@retikz/core';

import { AxesDefinition } from './definition';

const makeAxesDefinition = () => AxesDefinition;

/** Axes 的 Core Composite dependency provider */
export const AxesProvider: CompositeDependencyProvider = Object.freeze({
  key: Object.freeze({ namespace: AxesDefinition.namespace, type: AxesDefinition.type }),
  dependencies: Object.freeze([]),
  datasets: Object.freeze({}),
  makeDefinition: makeAxesDefinition,
});
