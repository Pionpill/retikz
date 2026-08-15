import type { CoreDependencyProvider } from '@retikz/core';

import { PathClipProvider } from '../../../clip';
import { SurfaceDefinition } from './definition';

/** Surface 的 Core Composite dependency provider */
export const SurfaceProvider: CoreDependencyProvider = Object.freeze({
  key: Object.freeze({ capability: 'composite', namespace: SurfaceDefinition.namespace, type: SurfaceDefinition.type }),
  dependencies: Object.freeze([PathClipProvider.key]),
  datasets: Object.freeze({}),
  makeDefinition: () => SurfaceDefinition,
});
