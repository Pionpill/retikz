import type { ClipDefinition, CoreDependencyProvider } from '@retikz/core';

import { CoreProviderCapability } from '@retikz/core';

import {
  CircleClipDefinition,
  CompoundClipDefinition,
  EllipseClipDefinition,
  PathClipDefinition,
  PolygonClipDefinition,
} from './definitions';

const clipProviderOf = (definition: ClipDefinition): CoreDependencyProvider =>
  Object.freeze({
    key: Object.freeze({ capability: CoreProviderCapability.Clip, name: definition.kind }),
    dependencies: Object.freeze([]),
    datasets: Object.freeze({}),
    makeDefinition: () => definition,
  });

/** Circle Clip 的静态 Core provider */
export const CircleClipProvider = clipProviderOf(CircleClipDefinition);

/** Ellipse Clip 的静态 Core provider */
export const EllipseClipProvider = clipProviderOf(EllipseClipDefinition);

/** Polygon Clip 的静态 Core provider */
export const PolygonClipProvider = clipProviderOf(PolygonClipDefinition);

/** Path Clip 的静态 Core provider */
export const PathClipProvider = clipProviderOf(PathClipDefinition);

/** Compound Clip 的静态 Core provider */
export const CompoundClipProvider = clipProviderOf(CompoundClipDefinition);
