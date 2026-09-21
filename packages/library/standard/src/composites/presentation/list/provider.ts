import type { CoreDependencyProvider } from '@retikz/core';

import { PathClipProvider } from '../../../clip';
import { ListDefinition } from './definition';
/** List 与单元格 lower target 的按需依赖声明 */
export const ListProvider: CoreDependencyProvider = {
  key: { capability: 'composite', namespace: 'standard', type: 'list' },
  dependencies: [PathClipProvider.key],
  datasets: {},
  makeDefinition: () => ListDefinition,
};
