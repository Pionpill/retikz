import type { CoreDependencyProvider } from '@retikz/core';
import { PathClipProvider } from '@retikz/extension';

import { QueueDefinition } from './definition';

/** Queue 及单格裁切依赖 */
export const QueueProvider: CoreDependencyProvider = {
  key: { capability: 'composite', namespace: 'standard', type: 'queue' },
  dependencies: [PathClipProvider.key],
  datasets: {},
  makeDefinition: () => QueueDefinition,
};
