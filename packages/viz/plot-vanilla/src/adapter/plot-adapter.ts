import type { ExternalDatasets } from '@retikz/data';
import type { LowerPlotsOptions } from '@retikz/plot';
import type { VanillaTier2Adapter } from '@retikz/vanilla';

import { lowerPlots, PLOT_NAMESPACE, PlotComposite, PlotSpecSchema, PlotThemeTokenDefinition } from '@retikz/plot';

import type { PlotEmbedProps } from '../spec';

/** 创建共享 datasets 与 lowering options 的 Plot Vanilla Tier2 adapter */
export const createPlotAdapter = (
  datasets: ExternalDatasets,
  options: LowerPlotsOptions = {},
): VanillaTier2Adapter<PlotEmbedProps> => {
  const makeComposites = (mergedDatasets: Record<string, unknown>) => {
    // Kernel 只扩大合并表的值类型；每个贡献都来自本 adapter 的 ExternalDatasets 闭包
    const plotDatasets = mergedDatasets as ExternalDatasets;
    return lowerPlots(plotDatasets, options);
  };

  return {
    kind: PLOT_NAMESPACE,
    namespace: PLOT_NAMESPACE,
    lower: (props, context) => {
      if (context.id.trim().length === 0) throw new Error('plot vanilla: embed id must be non-empty');
      const parsed = PlotSpecSchema.parse(props.spec);
      const node = PlotSpecSchema.parse({
        ...parsed,
        id: `${context.id}/${parsed.id ?? PlotComposite.Plot}`,
      });
      return { node, datasets, themeTokenDefinitions: [PlotThemeTokenDefinition], makeComposites };
    },
  };
};
