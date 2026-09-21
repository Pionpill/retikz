import type { CoreDependencyProvider } from '@retikz/core';

import { EllipseDefinition } from './definition';
/** Ellipse 的按需依赖贡献 */
export const EllipseProvider: CoreDependencyProvider = Object.freeze({
  key: Object.freeze({ capability: 'composite', namespace: 'standard', type: 'ellipse' }),
  dependencies: Object.freeze([]),
  datasets: Object.freeze({}),
  makeDefinition: () => EllipseDefinition,
});
