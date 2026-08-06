import type { CompositeArtifactOf, LayoutCompositeDefinition } from '@retikz/core';

import { defineComposite } from '@retikz/core';

import type { IROverlayLayout, OverlayLayoutArtifact } from './types';

import { STANDARD_NAMESPACE } from '../../shared';
import { compileOverlayLayout } from './pipeline';
import { OverlayLayoutArtifactSchema, OverlayLayoutSchema } from './schema';

/** Standard OverlayLayout 的官方 Core layout-aware composite definition */
export const OverlayLayoutDefinition: LayoutCompositeDefinition<
  IROverlayLayout,
  typeof STANDARD_NAMESPACE,
  'overlayLayout',
  OverlayLayoutArtifact
> = defineComposite({
  namespace: STANDARD_NAMESPACE,
  type: 'overlayLayout',
  schema: OverlayLayoutSchema,
  compile: compileOverlayLayout,
  artifactSchema: OverlayLayoutArtifactSchema,
});

/** OverlayLayout definition 推导出的公开 compile artifact envelope */
export type OverlayLayoutCompileArtifact = CompositeArtifactOf<typeof OverlayLayoutDefinition>;
