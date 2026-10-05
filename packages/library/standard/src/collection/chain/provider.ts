import type { CoreDependencyProvider } from '@retikz/core';
import { PathClipProvider } from '@retikz/extension';

import { ChainDefinition } from './definition';
/** Chain 与单元格 lower target 的按需依赖声明 */
export const ChainProvider: CoreDependencyProvider = {
  key: { capability: 'composite', namespace: 'standard', type: 'chain' },
  dependencies: [PathClipProvider.key],
  datasets: {},
  makeDefinition: () => ChainDefinition,
};
