import type { CompositeArtifactOf, LayoutCompositeDefinition } from '@retikz/core';

import { defineComposite } from '@retikz/core';

import type { ResolvedOverlayLayoutInspectLocalOptions } from '../shared';
import type { IROverlayLayout, OverlayLayoutArtifact } from './types';

import { OverlayLayoutInspectLocalOptionsInputSchema, OverlayLayoutInspectLocalOptionsSchema } from '../shared';
import { compileOverlayLayout } from './compile';
import { inspectOverlayLayoutArtifact } from './inspection';
import { OverlayLayoutArtifactSchema, OverlayLayoutSchema } from './schema';

/** Standard OverlayLayout 的官方 Core layout-aware composite definition */
export const OverlayLayoutDefinition: LayoutCompositeDefinition<
  IROverlayLayout,
  'standard',
  'overlayLayout',
  OverlayLayoutArtifact,
  typeof OverlayLayoutInspectLocalOptionsInputSchema.shape,
  ResolvedOverlayLayoutInspectLocalOptions
> = defineComposite({
  namespace: 'standard',
  type: 'overlayLayout',
  schema: OverlayLayoutSchema,
  compile: compileOverlayLayout,
  artifactSchema: OverlayLayoutArtifactSchema,
  inspector: {
    kind: 'layout',
    localOptionsInputSchema: OverlayLayoutInspectLocalOptionsInputSchema,
    localOptionsSchema: OverlayLayoutInspectLocalOptionsSchema,
    inspect: inspectOverlayLayoutArtifact,
  },
});

/** OverlayLayout definition 推导出的公开 compile artifact envelope */
export type OverlayLayoutCompileArtifact = CompositeArtifactOf<typeof OverlayLayoutDefinition>;
