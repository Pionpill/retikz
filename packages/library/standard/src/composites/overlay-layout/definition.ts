import type { CompositeArtifactOf, LayoutCompositeDefinition } from '@retikz/core';

import { defineComposite } from '@retikz/core';

import type { OverlayLayoutArtifact } from './artifact-types';
import type { IROverlayLayout } from './types';

import { OverlayLayoutArtifactSchema } from './artifact-schema';
import { compileOverlayLayout } from './compile';
import { OverlayLayoutSchema } from './schema';

/** Standard OverlayLayout 的官方 Core layout-aware composite definition */
export const OverlayLayoutDefinition: LayoutCompositeDefinition<
  IROverlayLayout,
  'standard',
  'overlayLayout',
  OverlayLayoutArtifact
> = defineComposite({
  namespace: 'standard',
  type: 'overlayLayout',
  schema: OverlayLayoutSchema,
  compile: compileOverlayLayout,
  artifactSchema: OverlayLayoutArtifactSchema,
});

/** OverlayLayout definition 推导出的公开 compile artifact envelope */
export type OverlayLayoutCompileArtifact = CompositeArtifactOf<typeof OverlayLayoutDefinition>;
