import type { CompositeArtifactOf, LayoutCompositeDefinition } from '@retikz/core';

import { defineComposite } from '@retikz/core';

import type { LegendArtifact } from './artifact-types';
import type { IRLegend } from './types';

import { LegendArtifactSchema } from './artifact-schema';
import { compileLegend } from './compile';
import { LegendSchema } from './schema';

/** Standard Legend 的官方 Core layout-aware composite definition */
export const LegendDefinition: LayoutCompositeDefinition<IRLegend, 'standard', 'legend', LegendArtifact> =
  defineComposite({
    namespace: 'standard',
    type: 'legend',
    schema: LegendSchema,
    compile: compileLegend,
    artifactSchema: LegendArtifactSchema,
  });

/** Legend definition 推导出的公开 compile artifact envelope */
export type LegendCompileArtifact = CompositeArtifactOf<typeof LegendDefinition>;
