import type { CoreDependencyProvider } from '@retikz/core';

import { ArcDefinition } from './definition';
/** Arc 的按需依赖贡献 */
export const ArcProvider: CoreDependencyProvider = Object.freeze({
  key: Object.freeze({ capability: 'composite', namespace: 'standard', type: 'arc' }),
  dependencies: Object.freeze([]),
  datasets: Object.freeze({}),
  makeDefinition: () => ArcDefinition,
});
