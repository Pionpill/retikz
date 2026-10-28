import type { ClipDefinition, CoreDependencyProvider } from '@retikz/core';
import { ProviderCapability } from '@retikz/core';

import {
  circleClipDefinition,
  compoundClipDefinition,
  ellipseClipDefinition,
  pathClipDefinition,
  polygonClipDefinition,
} from './definitions';

const clipProviderOf = (definition: ClipDefinition): CoreDependencyProvider =>
  Object.freeze({
    key: Object.freeze({ capability: ProviderCapability.Clip, name: definition.kind }),
    makeDefinition: () => definition,
  });

/** Circle Clip 的静态 Core provider */
export const circleClipProvider = clipProviderOf(circleClipDefinition);

/** Ellipse Clip 的静态 Core provider */
export const ellipseClipProvider = clipProviderOf(ellipseClipDefinition);

/** Polygon Clip 的静态 Core provider */
export const polygonClipProvider = clipProviderOf(polygonClipDefinition);

/** Path Clip 的静态 Core provider */
export const pathClipProvider = clipProviderOf(pathClipDefinition);

/** Compound Clip 的静态 Core provider */
export const compoundClipProvider = clipProviderOf(compoundClipDefinition);
