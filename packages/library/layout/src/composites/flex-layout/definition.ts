import type { CompositeArtifactOf, LayoutCompositeDefinition } from '@retikz/core';

import { defineComposite } from '@retikz/core';

import type { FlexLayoutArtifact, IRFlexLayout } from './types';

import { LAYOUT_NAMESPACE } from '../../shared';
import { compileFlexLayout } from './pipeline';
import { FlexLayoutArtifactSchema, FlexLayoutSchema } from './schema';

/** Layout FlexLayout 的官方 Core layout-aware composite definition */
export const FlexLayoutDefinition: LayoutCompositeDefinition<
  IRFlexLayout,
  typeof LAYOUT_NAMESPACE,
  'flexLayout',
  FlexLayoutArtifact
> = defineComposite({
  namespace: LAYOUT_NAMESPACE,
  type: 'flexLayout',
  schema: FlexLayoutSchema,
  compile: compileFlexLayout,
  artifactSchema: FlexLayoutArtifactSchema,
});

/** FlexLayout definition 推导出的公开 compile artifact envelope */
export type FlexLayoutCompileArtifact = CompositeArtifactOf<typeof FlexLayoutDefinition>;
