import type { CoreDependencyProvider } from '@retikz/core';
import { PathClipProvider } from '@retikz/extension';

import { ArrayDefinition } from './definition';

/** Array 与单元格 lower target 的按需依赖声明 */
export const ArrayProvider: CoreDependencyProvider = {
  key: { capability: 'composite', namespace: 'standard', type: 'array' },
  dependencies: [PathClipProvider.key],
  datasets: {},
  makeDefinition: () => ArrayDefinition,
};
