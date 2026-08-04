import type { CompositeArtifactOf, LayoutCompositeDefinition } from '@retikz/core';

import { defineComposite } from '@retikz/core';

import type { IRLegend, LegendArtifact } from './types';

import { STANDARD_NAMESPACE } from '../../shared';
import { compileLegend } from './pipeline';
import { LegendArtifactSchema, LegendSchema } from './schema';

/** Standard Legend 的官方 Core layout-aware composite definition */
export const LegendDefinition: LayoutCompositeDefinition<
  IRLegend,
  typeof STANDARD_NAMESPACE,
  'legend',
  LegendArtifact
> = defineComposite({
  namespace: STANDARD_NAMESPACE,
  type: 'legend',
  schema: LegendSchema,
  compile: compileLegend,
  artifactSchema: LegendArtifactSchema,
});

/** Legend definition 推导出的公开 compile artifact envelope */
export type LegendCompileArtifact = CompositeArtifactOf<typeof LegendDefinition>;
