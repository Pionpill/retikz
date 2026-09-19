import type { CoreDependencyProvider } from '@retikz/core';

import { CircleDefinition } from './definition';
/** Circle 的按需依赖贡献 */
export const CircleProvider: CoreDependencyProvider = Object.freeze({
  key: Object.freeze({ capability: 'composite', namespace: 'standard', type: 'circle' }),
  dependencies: Object.freeze([]),
  datasets: Object.freeze({}),
  makeDefinition: () => CircleDefinition,
});
