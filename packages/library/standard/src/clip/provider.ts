import type { AnyClipShapeDefinition, ClipDefinition, CoreDependencyProvider } from '@retikz/core';

import { CoreProviderCapability } from '@retikz/core';

import {
  CircleClipDefinition,
  CompoundClipDefinition,
  EllipseClipDefinition,
  PathClipDefinition,
  PolygonClipDefinition,
} from './definition';
import {
  CircleClipShapeDefinition,
  CompoundClipShapeDefinition,
  EllipseClipShapeDefinition,
  PathClipShapeDefinition,
  PolygonClipShapeDefinition,
} from './shape-definition';

const clipShapeProviderOf = (definition: AnyClipShapeDefinition): CoreDependencyProvider =>
  Object.freeze({
    key: Object.freeze({ capability: CoreProviderCapability.ClipShape, name: definition.kind }),
    dependencies: Object.freeze([]),
    datasets: Object.freeze({}),
    makeDefinition: () => definition,
  });

const clipProviderOf = (definition: ClipDefinition, shapeProvider: CoreDependencyProvider): CoreDependencyProvider =>
  Object.freeze({
    key: Object.freeze({ capability: CoreProviderCapability.Clip, name: definition.kind }),
    dependencies: Object.freeze([shapeProvider.key]),
    datasets: Object.freeze({}),
    makeDefinition: () => definition,
  });

/** Circle ClipShape 的静态 Core provider */
export const CircleClipShapeProvider = clipShapeProviderOf(CircleClipShapeDefinition);

/** Circle Clip operation 的静态 Core provider */
export const CircleClipProvider = clipProviderOf(CircleClipDefinition, CircleClipShapeProvider);

/** Ellipse ClipShape 的静态 Core provider */
export const EllipseClipShapeProvider = clipShapeProviderOf(EllipseClipShapeDefinition);

/** Ellipse Clip operation 的静态 Core provider */
export const EllipseClipProvider = clipProviderOf(EllipseClipDefinition, EllipseClipShapeProvider);

/** Polygon ClipShape 的静态 Core provider */
export const PolygonClipShapeProvider = clipShapeProviderOf(PolygonClipShapeDefinition);

/** Polygon Clip operation 的静态 Core provider */
export const PolygonClipProvider = clipProviderOf(PolygonClipDefinition, PolygonClipShapeProvider);

/** Path ClipShape 的静态 Core provider */
export const PathClipShapeProvider = clipShapeProviderOf(PathClipShapeDefinition);

/** Path Clip operation 的静态 Core provider */
export const PathClipProvider = clipProviderOf(PathClipDefinition, PathClipShapeProvider);

/** Compound ClipShape 的静态 Core provider */
export const CompoundClipShapeProvider = clipShapeProviderOf(CompoundClipShapeDefinition);

/** Compound Clip operation 的静态 Core provider */
export const CompoundClipProvider = clipProviderOf(CompoundClipDefinition, CompoundClipShapeProvider);
