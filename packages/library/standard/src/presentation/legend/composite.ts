import type { CompositeArtifactOf, LayoutCompositeDefinition, CoreDependencyProvider } from '@retikz/core';
import { defineComposite } from '@retikz/core';

import { STANDARD_NAMESPACE } from '../../shared';
import { compileLegend } from './pipeline';
import { LegendArtifactSchema, LegendSchema } from './schema';
import type { IRLegend, LegendArtifact, LegendInput } from './types';

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

/** 创建稀疏持久化的 Standard Legend composite */
export const createLegend = (input: LegendInput): IRLegend => ({
  namespace: STANDARD_NAMESPACE,
  type: 'legend',
  ...input,
});

/** Legend 的 Core Composite dependency provider */
export const LegendProvider: CoreDependencyProvider = Object.freeze({
  key: Object.freeze({ capability: 'composite', namespace: LegendDefinition.namespace, type: LegendDefinition.type }),
  dependencies: Object.freeze([]),
  datasets: Object.freeze({}),
  makeDefinition: () => LegendDefinition,
});
