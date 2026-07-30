import type { LayoutCompositeDefinition } from '@retikz/core';

import { defineComposite } from '@retikz/core';

import type { IROverlayLayout } from './types';

import { compileOverlayLayout } from './compile';
import { OverlayLayoutSchema } from './schema';

/** Standard OverlayLayout 的官方 Core layout-aware composite definition */
export const OverlayLayoutDefinition: LayoutCompositeDefinition<IROverlayLayout, 'standard', 'overlayLayout'> =
  defineComposite({
    namespace: 'standard',
    type: 'overlayLayout',
    schema: OverlayLayoutSchema,
    compile: compileOverlayLayout,
  });
