import type { CompositeDependencyProvider } from '@retikz/core';

import { LegendDefinition } from './definition';

const makeLegendDefinition = () => LegendDefinition;

/** Legend 的 Core Composite dependency provider */
export const LegendProvider: CompositeDependencyProvider = Object.freeze({
  key: Object.freeze({ namespace: LegendDefinition.namespace, type: LegendDefinition.type }),
  dependencies: Object.freeze([]),
  datasets: Object.freeze({}),
  makeDefinition: makeLegendDefinition,
});
