import type { CoreDependencyProvider } from '@retikz/core';

import { AxesDefinition } from './definition';

/** Axes 的 Core Composite dependency provider */
export const AxesProvider: CoreDependencyProvider = Object.freeze({
  key: Object.freeze({ capability: 'composite', namespace: AxesDefinition.namespace, type: AxesDefinition.type }),
  dependencies: Object.freeze([]),
  datasets: Object.freeze({}),
  makeDefinition: () => AxesDefinition,
});
