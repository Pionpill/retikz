import type { CompositeDependencyProvider } from '@retikz/core';

import { FlexLayoutDefinition } from './definition';

const makeFlexLayoutDefinition = () => FlexLayoutDefinition;

/** FlexLayout 的 Core Composite dependency provider */
export const FlexLayoutProvider: CompositeDependencyProvider = Object.freeze({
  key: Object.freeze({ namespace: FlexLayoutDefinition.namespace, type: FlexLayoutDefinition.type }),
  dependencies: Object.freeze([]),
  datasets: Object.freeze({}),
  makeDefinition: makeFlexLayoutDefinition,
});
