import type { LayoutCompositeDefinition, CoreDependencyProvider } from '@retikz/core';
import { defineComposite } from '@retikz/core';
import { PathClipProvider } from '@retikz/extension';

import { STANDARD_NAMESPACE } from '../../shared';
import { SURFACE_TYPE } from './constants';
import { compileSurface } from './pipeline';
import { SurfaceSchema } from './schema';
import type { IRSurface, SurfaceInput } from './types';

/** Standard Surface 的官方 Core layout-aware composite definition */
export const SurfaceDefinition: LayoutCompositeDefinition<IRSurface, typeof STANDARD_NAMESPACE, typeof SURFACE_TYPE> =
  defineComposite({
    namespace: STANDARD_NAMESPACE,
    type: SURFACE_TYPE,
    schema: SurfaceSchema,
    compile: compileSurface,
  });

/** 创建稀疏 Standard Surface composite */
export const createSurface = (input: SurfaceInput): IRSurface => ({ ...input });

/** Surface 的 Core Composite dependency provider */
export const SurfaceProvider: CoreDependencyProvider = Object.freeze({
  key: Object.freeze({ capability: 'composite', namespace: SurfaceDefinition.namespace, type: SurfaceDefinition.type }),
  dependencies: Object.freeze([PathClipProvider.key]),
  datasets: Object.freeze({}),
  makeDefinition: () => SurfaceDefinition,
});
