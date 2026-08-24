import type { CompositeCoreProviderKey, LayoutAxisProposal, LayoutCompositeDefinition } from '@retikz/core';

import { defineComposite, LayoutAxisProposalKind, LayoutChildProbeKind } from '@retikz/core';

import type { IRChartSource } from '../schemas';
import type { ChartProviderRegistry } from './types';

import { RetikzChartError, RetikzChartErrorCode } from '../../error';
import { CHART_NAMESPACE } from '../constants';
import { resolveChartFromProvider } from './resolve';

/** 创建当前 family 使用的 Core composite key */
export const chartProviderKeyOf = (family: string): CompositeCoreProviderKey =>
  Object.freeze({ capability: 'composite', namespace: CHART_NAMESPACE, type: family });

const chartProposalOf = (
  source: IRChartSource,
  proposal: Readonly<{ x: LayoutAxisProposal; y: LayoutAxisProposal }>,
): Readonly<{ x: LayoutAxisProposal; y: LayoutAxisProposal }> => ({
  x:
    source.layout?.width === undefined
      ? proposal.x
      : { kind: LayoutAxisProposalKind.Exact, value: source.layout.width },
  y:
    source.layout?.height === undefined
      ? proposal.y
      : { kind: LayoutAxisProposalKind.Exact, value: source.layout.height },
});

/** 从当前 active recipe registry 创建 layout-aware Chart composite */
export const createChartDefinition = (
  registry: ChartProviderRegistry,
): LayoutCompositeDefinition<IRChartSource, typeof CHART_NAMESPACE, string> => {
  if (registry.recipes.size === 0) {
    throw new RetikzChartError({
      code: RetikzChartErrorCode.InvalidRegistry,
      message: `Chart provider family "${registry.family}" requires at least one active recipe`,
      details: { path: ['recipes'] },
    });
  }
  return defineComposite({
    namespace: CHART_NAMESPACE,
    type: registry.family,
    schema: registry.schema,
    compile: (source, context) => {
      const recipe = registry.recipes.get(source.recipe.chartType);
      if (recipe === undefined) {
        throw new RetikzChartError({
          code: RetikzChartErrorCode.UnknownDefinition,
          message: `Chart recipe "${source.recipe.chartType}" is not active in this Chart provider`,
          details: { path: ['recipe', 'chartType'], chartType: source.recipe.chartType },
        });
      }
      if (source.type !== registry.family) {
        throw new RetikzChartError({
          code: RetikzChartErrorCode.FamilyMismatch,
          message: `Chart family "${source.type}" does not match provider family "${registry.family}"`,
          details: { path: ['type'], family: source.type, expected: registry.family },
        });
      }
      const resolution = resolveChartFromProvider(source, { theme: context.theme, registry });
      for (const warning of resolution.warnings) {
        context.warn(warning.code, warning.message, warning.subPath);
      }
      const proposal = chartProposalOf(source, context.proposal);
      const probe = context.layoutChild(resolution.presentation.surface, proposal);
      if (probe.kind === LayoutChildProbeKind.Failed) return context.raise(probe.failure);
      return {
        children: [context.replay(probe.result)],
        allocationBounds: {
          x: 0,
          y: 0,
          width: probe.result.slotSize.width,
          height: probe.result.slotSize.height,
        },
      };
    },
  });
};
