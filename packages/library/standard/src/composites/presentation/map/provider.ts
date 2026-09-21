import type { CoreDependencyProvider } from '@retikz/core';

import { PathClipProvider } from '../../../clip';
import { MapDefinition } from './definition';
/** Map 与单元格 lower target 的按需依赖声明 */
export const MapProvider: CoreDependencyProvider = {
  key: { capability: 'composite', namespace: 'standard', type: 'map' },
  dependencies: [PathClipProvider.key],
  datasets: {},
  makeDefinition: () => MapDefinition,
};
