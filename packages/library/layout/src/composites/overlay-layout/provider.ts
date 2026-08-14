import type { CoreDependencyProvider } from '@retikz/core';

import { OverlayLayoutDefinition } from './definition';

const makeOverlayLayoutDefinition = () => OverlayLayoutDefinition;

/** OverlayLayout 的 Core Composite dependency provider */
export const OverlayLayoutProvider: CoreDependencyProvider = Object.freeze({
  key: Object.freeze({ capability: 'composite', namespace: OverlayLayoutDefinition.namespace, type: OverlayLayoutDefinition.type }),
  dependencies: Object.freeze([]),
  datasets: Object.freeze({}),
  makeDefinition: makeOverlayLayoutDefinition,
});
