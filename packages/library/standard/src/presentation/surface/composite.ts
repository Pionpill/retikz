import type { CompositeDefinition, CoreDependencyProvider } from '@retikz/core';
import { defineComposite } from '@retikz/core';
import { pathClipProvider } from '@retikz/extension';

import { STANDARD_NAMESPACE } from '../../shared';
import { SURFACE_TYPE } from './constants';
import { compileSurface } from './pipeline';
import { SurfaceSchema } from './schema';
import type { IRSurface, InputSurfaceConfig } from './types';

/** Standard Surface 的官方 Core layout-aware composite definition */
export const surfaceDefinition: CompositeDefinition<IRSurface, typeof STANDARD_NAMESPACE, typeof SURFACE_TYPE> =
  defineComposite({
    namespace: STANDARD_NAMESPACE,
    type: SURFACE_TYPE,
    schema: SurfaceSchema,
    compile: compileSurface,
  });

/** 创建稀疏 Standard Surface composite */
export const createSurface = (input: InputSurfaceConfig): IRSurface => ({ ...input });

/** Surface 的 Core Composite dependency provider */
export const surfaceProvider: CoreDependencyProvider = Object.freeze({
  key: Object.freeze({ capability: 'composite', namespace: surfaceDefinition.namespace, type: surfaceDefinition.type }),
  dependencies: Object.freeze([pathClipProvider.key]),
  makeDefinition: () => surfaceDefinition,
});
