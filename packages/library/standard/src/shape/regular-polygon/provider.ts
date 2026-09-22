import type { CoreDependencyProvider } from '@retikz/core';

import { RegularPolygonDefinition } from './definition';
/** RegularPolygon 的按需依赖贡献 */
export const RegularPolygonProvider: CoreDependencyProvider = Object.freeze({
  key: Object.freeze({ capability: 'composite', namespace: 'standard', type: 'regularPolygon' }),
  dependencies: Object.freeze([]),
  datasets: Object.freeze({}),
  makeDefinition: () => RegularPolygonDefinition,
});
