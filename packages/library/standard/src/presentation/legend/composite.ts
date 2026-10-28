import type { CompositeArtifactOf, CompositeDefinition, CoreDependencyProvider } from '@retikz/core';
import { defineComposite } from '@retikz/core';

import { STANDARD_NAMESPACE } from '../../shared';
import { compileLegend } from './pipeline';
import { LegendArtifactSchema, LegendSchema } from './schema';
import type { IRLegend, LegendArtifact, InputLegendConfig } from './types';

/** Standard Legend 的官方 Core layout-aware composite definition */
export const legendDefinition: CompositeDefinition<IRLegend, typeof STANDARD_NAMESPACE, 'legend', LegendArtifact> =
  defineComposite({
    namespace: STANDARD_NAMESPACE,
    type: 'legend',
    schema: LegendSchema,
    compile: compileLegend,
    artifactSchema: LegendArtifactSchema,
  });

/** Legend definition 推导出的公开 compile artifact envelope */
export type LegendCompileArtifact = CompositeArtifactOf<typeof legendDefinition>;

/** 创建稀疏持久化的 Standard Legend composite */
export const createLegend = (input: InputLegendConfig): IRLegend => ({
  namespace: STANDARD_NAMESPACE,
  type: 'legend',
  ...input,
});

/** Legend 的 Core Composite dependency provider */
export const legendProvider: CoreDependencyProvider = Object.freeze({
  key: Object.freeze({ capability: 'composite', namespace: legendDefinition.namespace, type: legendDefinition.type }),
  makeDefinition: () => legendDefinition,
});
