import type { CoreDependencyProvider } from '@retikz/core';
import { PathClipProvider } from '@retikz/extension';

import { MatrixDefinition } from './definition';
/** Matrix 与单元格 lower target 的按需依赖声明 */
export const MatrixProvider: CoreDependencyProvider = {
  key: { capability: 'composite', namespace: 'standard', type: 'matrix' },
  dependencies: [PathClipProvider.key],
  datasets: {},
  makeDefinition: () => MatrixDefinition,
};
