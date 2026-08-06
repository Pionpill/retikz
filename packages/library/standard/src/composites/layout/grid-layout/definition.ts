import type { CompositeArtifactOf, LayoutCompositeDefinition } from '@retikz/core';

import { defineComposite, defineInspector } from '@retikz/core';

import type { GridLayoutArtifact, IRGridLayout, ResolvedGridLayoutInspectOptions } from './types';

import { STANDARD_NAMESPACE } from '../../shared';
import { inspectGridLayoutArtifact } from './inspection';
import { compileGridLayout } from './pipeline';
import {
  GridLayoutArtifactSchema,
  GridLayoutInspectOptionsInputSchema,
  GridLayoutInspectOptionsSchema,
  GridLayoutSchema,
} from './schema';

/** Standard GridLayout 的官方 Core layout-aware composite definition */
export const GridLayoutDefinition: LayoutCompositeDefinition<
  IRGridLayout,
  typeof STANDARD_NAMESPACE,
  'gridLayout',
  GridLayoutArtifact,
  typeof GridLayoutInspectOptionsInputSchema.shape,
  ResolvedGridLayoutInspectOptions
> = defineComposite({
  namespace: STANDARD_NAMESPACE,
  type: 'gridLayout',
  schema: GridLayoutSchema,
  compile: compileGridLayout,
  artifactSchema: GridLayoutArtifactSchema,
  inspector: defineInspector({
    kind: 'composite',
    optionsInputSchema: GridLayoutInspectOptionsInputSchema,
    optionsSchema: GridLayoutInspectOptionsSchema,
    inspect: inspectGridLayoutArtifact,
  }),
});

/** GridLayout definition 推导出的公开 compile artifact envelope */
export type GridLayoutCompileArtifact = CompositeArtifactOf<typeof GridLayoutDefinition>;
