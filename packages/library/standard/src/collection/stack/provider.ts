import type { CoreDependencyProvider } from '@retikz/core';
import { PathClipProvider } from '@retikz/extension';

import { StackDefinition } from './definition';

/** Stack 及单格裁切依赖 */
export const StackProvider: CoreDependencyProvider = {
  key: { capability: 'composite', namespace: 'standard', type: 'stack' },
  dependencies: [PathClipProvider.key],
  datasets: {},
  makeDefinition: () => StackDefinition,
};
