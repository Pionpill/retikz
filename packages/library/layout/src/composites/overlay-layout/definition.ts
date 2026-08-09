import type { CompositeArtifactOf, LayoutCompositeDefinition } from '@retikz/core';

import { defineComposite } from '@retikz/core';

import type { IROverlayLayout, OverlayLayoutArtifact } from './types';

import { LAYOUT_NAMESPACE } from '../../shared';
import { compileOverlayLayout } from './pipeline';
import { OverlayLayoutArtifactSchema, OverlayLayoutSchema } from './schema';

/** Layout OverlayLayout 的官方 Core layout-aware composite definition */
export const OverlayLayoutDefinition: LayoutCompositeDefinition<
  IROverlayLayout,
  typeof LAYOUT_NAMESPACE,
  'overlayLayout',
  OverlayLayoutArtifact
> = defineComposite({
  namespace: LAYOUT_NAMESPACE,
  type: 'overlayLayout',
  schema: OverlayLayoutSchema,
  compile: compileOverlayLayout,
  artifactSchema: OverlayLayoutArtifactSchema,
});

/** OverlayLayout definition 推导出的公开 compile artifact envelope */
export type OverlayLayoutCompileArtifact = CompositeArtifactOf<typeof OverlayLayoutDefinition>;
