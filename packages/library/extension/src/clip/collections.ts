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

/** Extension 提供的全部可选裁剪 Definition */
export const ExtensionClipDefinitions: ReadonlyArray<ClipDefinition> = [
  CircleClipDefinition,
  EllipseClipDefinition,
  PolygonClipDefinition,
  PathClipDefinition,
  CompoundClipDefinition,
];

/** Extension 提供的全部裁剪 Provider */
export const ExtensionClipProviders: ReadonlyArray<CoreDependencyProvider> = [
  CircleClipProvider,
  EllipseClipProvider,
  PolygonClipProvider,
  PathClipProvider,
  CompoundClipProvider,
];
