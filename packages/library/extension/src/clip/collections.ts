import type { ClipDefinition, CoreDependencyProvider } from '@retikz/core';

import {
  circleClipDefinition,
  compoundClipDefinition,
  ellipseClipDefinition,
  pathClipDefinition,
  polygonClipDefinition,
} from './definitions';
import {
  circleClipProvider,
  compoundClipProvider,
  ellipseClipProvider,
  pathClipProvider,
  polygonClipProvider,
} from './providers';

/** Extension 提供的全部可选裁剪 Definition */
export const extensionClipDefinitions: ReadonlyArray<ClipDefinition> = [
  circleClipDefinition,
  ellipseClipDefinition,
  polygonClipDefinition,
  pathClipDefinition,
  compoundClipDefinition,
];

/** Extension 提供的全部裁剪 Provider */
export const extensionClipProviders: ReadonlyArray<CoreDependencyProvider> = [
  circleClipProvider,
  ellipseClipProvider,
  polygonClipProvider,
  pathClipProvider,
  compoundClipProvider,
];
