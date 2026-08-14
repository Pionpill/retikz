import type { ClipDefinition, CoreDependencyProvider } from '@retikz/core';

import { CompoundClipDefinition, PathClipDefinition, PolygonClipDefinition } from './definition';
import { CompoundClipProvider, PathClipProvider, PolygonClipProvider } from './provider';

/** Standard 提供的全部可选裁剪 Definition */
export const StandardClipDefinitions: ReadonlyArray<ClipDefinition> = [
  CompoundClipDefinition,
  PolygonClipDefinition,
  PathClipDefinition,
];

/** Standard 提供的全部裁剪 Provider */
export const StandardClipProviders: ReadonlyArray<CoreDependencyProvider> = [
  CompoundClipProvider,
  PolygonClipProvider,
  PathClipProvider,
];
