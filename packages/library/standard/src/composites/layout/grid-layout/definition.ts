import type { CompositeArtifactOf, LayoutCompositeDefinition } from '@retikz/core';

import { defineComposite } from '@retikz/core';

import type { ResolvedGridLayoutInspectLocalOptions } from '../shared';
import type { GridLayoutArtifact, IRGridLayout } from './types';

import { GridLayoutInspectLocalOptionsInputSchema, GridLayoutInspectLocalOptionsSchema } from '../shared';
import { compileGridLayout } from './compile';
import { inspectGridLayoutArtifact } from './inspection';
import { GridLayoutArtifactSchema, GridLayoutSchema } from './schema';

/** Standard GridLayout 的官方 Core layout-aware composite definition */
export const GridLayoutDefinition: LayoutCompositeDefinition<
  IRGridLayout,
  'standard',
  'gridLayout',
  GridLayoutArtifact,
  typeof GridLayoutInspectLocalOptionsInputSchema.shape,
  ResolvedGridLayoutInspectLocalOptions
> = defineComposite({
  namespace: 'standard',
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
