import type { CoreDependencyProvider } from '@retikz/core';

import { StarDefinition } from './definition';
/** Star 的按需依赖贡献 */
export const StarProvider: CoreDependencyProvider = Object.freeze({
  key: Object.freeze({ capability: 'composite', namespace: 'standard', type: 'star' }),
  dependencies: Object.freeze([]),
  datasets: Object.freeze({}),
  makeDefinition: () => StarDefinition,
});
