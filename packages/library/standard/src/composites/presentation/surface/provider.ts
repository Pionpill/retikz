import type { CompositeDependencyProvider } from '@retikz/core';

import { SurfaceDefinition } from './definition';

const makeSurfaceDefinition = () => SurfaceDefinition;

/** Surface 的 Core Composite dependency provider */
export const SurfaceProvider: CompositeDependencyProvider = Object.freeze({
  key: Object.freeze({ namespace: SurfaceDefinition.namespace, type: SurfaceDefinition.type }),
  dependencies: Object.freeze([]),
  datasets: Object.freeze({}),
  makeDefinition: makeSurfaceDefinition,
});
