import type { CompositeArtifactOf, LayoutCompositeDefinition } from '@retikz/core';

import { defineComposite } from '@retikz/core';

import type { GridLayoutArtifact, IRGridLayout } from './types';

import { STANDARD_NAMESPACE } from '../../shared';
import { compileGridLayout } from './pipeline';
import { GridLayoutArtifactSchema, GridLayoutSchema } from './schema';

/** Standard GridLayout 的官方 Core layout-aware composite definition */
export const GridLayoutDefinition: LayoutCompositeDefinition<
  IRGridLayout,
  typeof STANDARD_NAMESPACE,
  'gridLayout',
  GridLayoutArtifact
> = defineComposite({
  namespace: STANDARD_NAMESPACE,
  type: 'gridLayout',
  schema: GridLayoutSchema,
  compile: compileGridLayout,
  artifactSchema: GridLayoutArtifactSchema,
});

/** GridLayout definition 推导出的公开 compile artifact envelope */
export type GridLayoutCompileArtifact = CompositeArtifactOf<typeof GridLayoutDefinition>;
