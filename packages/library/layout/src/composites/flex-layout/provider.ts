import type { CoreDependencyProvider } from '@retikz/core';

import { FlexLayoutDefinition } from './definition';

const makeFlexLayoutDefinition = () => FlexLayoutDefinition;

/** FlexLayout 的 Core Composite dependency provider */
export const FlexLayoutProvider: CoreDependencyProvider = Object.freeze({
  key: Object.freeze({ capability: 'composite', namespace: FlexLayoutDefinition.namespace, type: FlexLayoutDefinition.type }),
  dependencies: Object.freeze([]),
  datasets: Object.freeze({}),
  makeDefinition: makeFlexLayoutDefinition,
});
