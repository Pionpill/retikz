import type { CompositeDependencyProvider } from '@retikz/core';

import { OverlayLayoutDefinition } from './definition';

const makeOverlayLayoutDefinition = () => OverlayLayoutDefinition;

/** OverlayLayout 的 Core Composite dependency provider */
export const OverlayLayoutProvider: CompositeDependencyProvider = Object.freeze({
  key: Object.freeze({ namespace: OverlayLayoutDefinition.namespace, type: OverlayLayoutDefinition.type }),
  dependencies: Object.freeze([]),
  datasets: Object.freeze({}),
  makeDefinition: makeOverlayLayoutDefinition,
});
