import type { CoreDependencyProvider } from '@retikz/core';

import { PolygonDefinition } from './definition';

/** Polygon 的按需依赖贡献 */
export const PolygonProvider: CoreDependencyProvider = Object.freeze({
  key: Object.freeze({ capability: 'composite', namespace: 'standard', type: 'polygon' }),
  dependencies: Object.freeze([]),
  datasets: Object.freeze({}),
  makeDefinition: () => PolygonDefinition,
});
