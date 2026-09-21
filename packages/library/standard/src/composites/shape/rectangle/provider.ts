import type { CoreDependencyProvider } from '@retikz/core';

import { RectangleDefinition } from './definition';
/** Rectangle 的按需依赖贡献 */
export const RectangleProvider: CoreDependencyProvider = Object.freeze({
  key: Object.freeze({ capability: 'composite', namespace: 'standard', type: 'rectangle' }),
  dependencies: Object.freeze([]),
  datasets: Object.freeze({}),
  makeDefinition: () => RectangleDefinition,
});
