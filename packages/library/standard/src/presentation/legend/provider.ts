import type { CoreDependencyProvider } from '@retikz/core';

import { LegendDefinition } from './definition';

/** Legend 的 Core Composite dependency provider */
export const LegendProvider: CoreDependencyProvider = Object.freeze({
  key: Object.freeze({ capability: 'composite', namespace: LegendDefinition.namespace, type: LegendDefinition.type }),
  dependencies: Object.freeze([]),
  datasets: Object.freeze({}),
  makeDefinition: () => LegendDefinition,
});
