import type { LayoutCompositeDefinition } from '@retikz/core';

import { defineComposite } from '@retikz/core';

import type { IRSurface } from './types';

import { STANDARD_NAMESPACE } from '../../shared';
import { SURFACE_TYPE } from './constants';
import { compileSurface } from './pipeline';
import { SurfaceSchema } from './schema';

/** Standard Surface 的官方 Core layout-aware composite definition */
export const SurfaceDefinition: LayoutCompositeDefinition<IRSurface, typeof STANDARD_NAMESPACE, typeof SURFACE_TYPE> =
  defineComposite({
    namespace: STANDARD_NAMESPACE,
    type: SURFACE_TYPE,
    schema: SurfaceSchema,
    compile: compileSurface,
  });
