import type { CoreDependencyProvider } from '@retikz/core';

import { CompoundClipDefinition, PathClipDefinition, PolygonClipDefinition } from './definition';

/** Compound Clip 的静态 Core provider */
export const CompoundClipProvider: CoreDependencyProvider = Object.freeze({
  key: Object.freeze({ capability: 'clip', name: CompoundClipDefinition.kind }),
  dependencies: Object.freeze([]),
  datasets: Object.freeze({}),
  makeDefinition: () => CompoundClipDefinition,
});

/** Polygon Clip 的静态 Core provider */
export const PolygonClipProvider: CoreDependencyProvider = Object.freeze({
  key: Object.freeze({ capability: 'clip', name: PolygonClipDefinition.kind }),
  dependencies: Object.freeze([]),
  datasets: Object.freeze({}),
  makeDefinition: () => PolygonClipDefinition,
});

/** Path Clip 的静态 Core provider */
export const PathClipProvider: CoreDependencyProvider = Object.freeze({
  key: Object.freeze({ capability: 'clip', name: PathClipDefinition.kind }),
  dependencies: Object.freeze([]),
  datasets: Object.freeze({}),
  makeDefinition: () => PathClipDefinition,
});
