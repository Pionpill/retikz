import type { CoreDependencyProvider } from '@retikz/core';

import { SectorDefinition } from './definition';
/** Sector 的按需依赖贡献 */
export const SectorProvider: CoreDependencyProvider = Object.freeze({
  key: Object.freeze({ capability: 'composite', namespace: 'standard', type: 'sector' }),
  dependencies: Object.freeze([]),
  datasets: Object.freeze({}),
  makeDefinition: () => SectorDefinition,
});
