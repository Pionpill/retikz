import type { AnyClipShapeDefinition, ClipDefinition, CoreDependencyProvider } from '@retikz/core';

import {
  CircleClipDefinition,
  CompoundClipDefinition,
  EllipseClipDefinition,
  PathClipDefinition,
  PolygonClipDefinition,
} from './definition';
import {
  CircleClipProvider,
  CircleClipShapeProvider,
  CompoundClipProvider,
  CompoundClipShapeProvider,
  EllipseClipProvider,
  EllipseClipShapeProvider,
  PathClipProvider,
  PathClipShapeProvider,
  PolygonClipProvider,
  PolygonClipShapeProvider,
} from './provider';
import {
  CircleClipShapeDefinition,
  CompoundClipShapeDefinition,
  EllipseClipShapeDefinition,
  PathClipShapeDefinition,
  PolygonClipShapeDefinition,
} from './shape-definition';

/** Standard 提供的全部可选裁剪 Definition */
export const StandardClipDefinitions: ReadonlyArray<ClipDefinition> = [
  CircleClipDefinition,
  EllipseClipDefinition,
  PolygonClipDefinition,
  PathClipDefinition,
  CompoundClipDefinition,
];

/** Standard 提供的全部可选 ClipShape Definition */
export const StandardClipShapeDefinitions: ReadonlyArray<AnyClipShapeDefinition> = [
  CircleClipShapeDefinition,
  EllipseClipShapeDefinition,
  PolygonClipShapeDefinition,
  PathClipShapeDefinition,
  CompoundClipShapeDefinition,
];

/** Standard 提供的全部裁剪 Provider */
export const StandardClipProviders: ReadonlyArray<CoreDependencyProvider> = [
  CircleClipShapeProvider,
  CircleClipProvider,
  EllipseClipShapeProvider,
  EllipseClipProvider,
  PolygonClipShapeProvider,
  PolygonClipProvider,
  PathClipShapeProvider,
  PathClipProvider,
  CompoundClipShapeProvider,
  CompoundClipProvider,
];
