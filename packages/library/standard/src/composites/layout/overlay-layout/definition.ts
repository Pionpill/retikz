import type { CompositeArtifactOf, LayoutCompositeDefinition } from '@retikz/core';

import { defineComposite } from '@retikz/core';

import type { IROverlayLayout, OverlayLayoutArtifact, ResolvedOverlayLayoutInspectLocalOptions } from './types';

import { STANDARD_NAMESPACE } from '../../shared';
import { inspectOverlayLayoutArtifact } from './inspection';
import { compileOverlayLayout } from './pipeline';
import {
  OverlayLayoutArtifactSchema,
  OverlayLayoutInspectLocalOptionsInputSchema,
  OverlayLayoutInspectLocalOptionsSchema,
  OverlayLayoutSchema,
} from './schema';

/** Standard OverlayLayout 的官方 Core layout-aware composite definition */
export const OverlayLayoutDefinition: LayoutCompositeDefinition<
  IROverlayLayout,
  typeof STANDARD_NAMESPACE,
  'overlayLayout',
  OverlayLayoutArtifact,
  typeof OverlayLayoutInspectLocalOptionsInputSchema.shape,
  ResolvedOverlayLayoutInspectLocalOptions
> = defineComposite({
  namespace: STANDARD_NAMESPACE,
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
