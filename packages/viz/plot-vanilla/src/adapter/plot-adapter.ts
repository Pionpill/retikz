import type { CompositeDependencyContribution, CompositeDependencyProvider } from '@retikz/core';
import type { ExternalDatasets } from '@retikz/data';
import type { IRPlotSpec, LowerPlotsOptions } from '@retikz/plot';
import type { VanillaTier2Adapter } from '@retikz/vanilla';

import {
  createPlotProvider as createPlotDependencyProvider,
  PLOT_NAMESPACE,
  PlotComposite,
  PlotSpecSchema,
} from '@retikz/plot';

import type { PlotEmbedProps } from '../spec';

import { assertPlotVanillaNonEmptyString } from '../shared';

/** 完整 PlotSpec 的 Vanilla contribution 输入 */
export type PlotContributionInput = Readonly<{
  /** 已完成的 PlotSpec */
  spec: IRPlotSpec;
  /** runtime-only dataset table */
  datasets: ExternalDatasets;
  /** Plot lowering runtime options */
  lowerOptions?: LowerPlotsOptions;
}>;

/** Plot-owned Vanilla contribution 解析结果 */
export type ResolvedPlotContribution = Readonly<{
  /** 经 schema 校验的完整 PlotSpec */
  spec: IRPlotSpec;
  /** 只包含 `plot.plot` 的 provider contribution */
  contribution: CompositeDependencyContribution;
}>;

/** 创建一个共享 datasets 与 lowering options 的 Plot dependency provider */
export const createPlotProvider = (input: {
  datasets: ExternalDatasets;
  lowerOptions?: LowerPlotsOptions;
}): CompositeDependencyProvider => createPlotDependencyProvider(input.datasets, input.lowerOptions);

/** 将完整 PlotSpec 归一为 Plot-owned dependency contribution */
export const resolvePlotContribution = (input: PlotContributionInput): ResolvedPlotContribution => {
  const spec = PlotSpecSchema.parse(input.spec);
  const provider = createPlotProvider({ datasets: input.datasets, lowerOptions: input.lowerOptions });
  return { spec, contribution: { roots: [provider.key], providers: [provider] } };
};

/** 创建共享 datasets 与 lowering options 的 Plot Vanilla Tier2 adapter */
export const createPlotAdapter = (
  datasets: ExternalDatasets,
  options: LowerPlotsOptions = {},
): VanillaTier2Adapter<PlotEmbedProps> => {
  const provider = createPlotProvider({ datasets, lowerOptions: options });

  return {
    kind: PLOT_NAMESPACE,
    lower: (props, context) => {
      assertPlotVanillaNonEmptyString(context.id, 'plot vanilla: embed id must be non-empty');
      const parsed = PlotSpecSchema.parse(props.spec);
      const node = PlotSpecSchema.parse({
        ...parsed,
        id: `${context.id}/${parsed.id ?? PlotComposite.Plot}`,
      });
      return {
        node,
        compositeDependencies: { roots: [provider.key], providers: [provider] },
      };
    },
  };
};
