import type { CompositeArtifactOf, LayoutCompositeDefinition } from '@retikz/core';

import { defineComposite } from '@retikz/core';

import type { GridLayoutArtifact, IRGridLayout, ResolvedGridLayoutInspectLocalOptions } from './types';

import { STANDARD_NAMESPACE } from '../../shared';
import { inspectGridLayoutArtifact } from './inspection';
import { compileGridLayout } from './pipeline';
import {
  GridLayoutArtifactSchema,
  GridLayoutInspectLocalOptionsInputSchema,
  GridLayoutInspectLocalOptionsSchema,
  GridLayoutSchema,
} from './schema';

/** Standard GridLayout 的官方 Core layout-aware composite definition */
export const GridLayoutDefinition: LayoutCompositeDefinition<
  IRGridLayout,
  typeof STANDARD_NAMESPACE,
  'gridLayout',
  GridLayoutArtifact,
  typeof GridLayoutInspectLocalOptionsInputSchema.shape,
  ResolvedGridLayoutInspectLocalOptions
> = defineComposite({
  namespace: STANDARD_NAMESPACE,
  type: 'gridLayout',
  schema: GridLayoutSchema,
  compile: compileGridLayout,
  artifactSchema: GridLayoutArtifactSchema,
  inspector: {
    kind: 'layout',
    localOptionsInputSchema: GridLayoutInspectLocalOptionsInputSchema,
    localOptionsSchema: GridLayoutInspectLocalOptionsSchema,
    inspect: inspectGridLayoutArtifact,
  },
});

/** GridLayout definition 推导出的公开 compile artifact envelope */
export type GridLayoutCompileArtifact = CompositeArtifactOf<typeof GridLayoutDefinition>;
