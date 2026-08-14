import type { CoreDependencyProvider } from '@retikz/core';

import { CompoundClipDefinition, PathClipDefinition, PolygonClipDefinition } from './definition';

const makeCompoundClipDefinition = () => CompoundClipDefinition;
const makePathClipDefinition = () => PathClipDefinition;
const makePolygonClipDefinition = () => PolygonClipDefinition;

/** Compound Clip 的静态 Core provider */
export const CompoundClipProvider: CoreDependencyProvider = Object.freeze({
  key: Object.freeze({ capability: 'clip', name: CompoundClipDefinition.kind }),
  dependencies: Object.freeze([]),
  datasets: Object.freeze({}),
  makeDefinition: makeCompoundClipDefinition,
});

/** Polygon Clip 的静态 Core provider */
export const PolygonClipProvider: CoreDependencyProvider = Object.freeze({
  key: Object.freeze({ capability: 'clip', name: PolygonClipDefinition.kind }),
  dependencies: Object.freeze([]),
  datasets: Object.freeze({}),
  makeDefinition: makePolygonClipDefinition,
});

/** Path Clip 的静态 Core provider */
export const PathClipProvider: CoreDependencyProvider = Object.freeze({
  key: Object.freeze({ capability: 'clip', name: PathClipDefinition.kind }),
  dependencies: Object.freeze([]),
  datasets: Object.freeze({}),
  makeDefinition: makePathClipDefinition,
});
