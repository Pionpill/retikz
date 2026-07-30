import type { CompositeArtifactOf, LayoutCompositeDefinition } from '@retikz/core';

import { defineComposite } from '@retikz/core';

import type { GridLayoutArtifact } from './artifact-types';
import type { IRGridLayout } from './types';

import { GridLayoutArtifactSchema } from './artifact-schema';
import { compileGridLayout } from './compile';
import { GridLayoutSchema } from './schema';

/** Standard GridLayout 的官方 Core layout-aware composite definition */
export const GridLayoutDefinition: LayoutCompositeDefinition<
  IRGridLayout,
  'standard',
  'gridLayout',
  GridLayoutArtifact
> = defineComposite({
  namespace: 'standard',
  type: 'gridLayout',
  schema: GridLayoutSchema,
  compile: compileGridLayout,
  artifactSchema: GridLayoutArtifactSchema,
});

/** GridLayout definition 推导出的公开 compile artifact envelope */
export type GridLayoutCompileArtifact = CompositeArtifactOf<typeof GridLayoutDefinition>;
