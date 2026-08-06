import type { CompositeArtifactOf, LayoutCompositeDefinition } from '@retikz/core';

import { defineComposite, defineInspector } from '@retikz/core';

import type { IROverlayLayout, OverlayLayoutArtifact, ResolvedOverlayLayoutInspectOptions } from './types';

import { STANDARD_NAMESPACE } from '../../shared';
import { inspectOverlayLayoutArtifact } from './inspection';
import { compileOverlayLayout } from './pipeline';
import {
  OverlayLayoutArtifactSchema,
  OverlayLayoutInspectOptionsInputSchema,
  OverlayLayoutInspectOptionsSchema,
  OverlayLayoutSchema,
} from './schema';

/** Standard OverlayLayout 的官方 Core layout-aware composite definition */
export const OverlayLayoutDefinition: LayoutCompositeDefinition<
  IROverlayLayout,
  typeof STANDARD_NAMESPACE,
  'overlayLayout',
  OverlayLayoutArtifact,
  typeof OverlayLayoutInspectOptionsInputSchema.shape,
  ResolvedOverlayLayoutInspectOptions
> = defineComposite({
  namespace: STANDARD_NAMESPACE,
  type: 'overlayLayout',
  schema: OverlayLayoutSchema,
  compile: compileOverlayLayout,
  artifactSchema: OverlayLayoutArtifactSchema,
  inspector: defineInspector({
    kind: 'composite',
    optionsInputSchema: OverlayLayoutInspectOptionsInputSchema,
    optionsSchema: OverlayLayoutInspectOptionsSchema,
    inspect: inspectOverlayLayoutArtifact,
  }),
});

/** OverlayLayout definition 推导出的公开 compile artifact envelope */
export type OverlayLayoutCompileArtifact = CompositeArtifactOf<typeof OverlayLayoutDefinition>;
