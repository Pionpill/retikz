import type { ClipDefinition, CoreDependencyProvider } from '@retikz/core';

import {
  CircleClipDefinition,
  CompoundClipDefinition,
  EllipseClipDefinition,
  PathClipDefinition,
  PolygonClipDefinition,
} from './definitions';
import {
  CircleClipProvider,
  CompoundClipProvider,
  EllipseClipProvider,
  PathClipProvider,
  PolygonClipProvider,
} from './providers';

/** Standard 提供的全部可选裁剪 Definition */
export const StandardClipDefinitions: ReadonlyArray<ClipDefinition> = [
  CircleClipDefinition,
  EllipseClipDefinition,
  PolygonClipDefinition,
  PathClipDefinition,
  CompoundClipDefinition,
];

/** Standard 提供的全部裁剪 Provider */
export const StandardClipProviders: ReadonlyArray<CoreDependencyProvider> = [
  CircleClipProvider,
  EllipseClipProvider,
  PolygonClipProvider,
  PathClipProvider,
  CompoundClipProvider,
];
