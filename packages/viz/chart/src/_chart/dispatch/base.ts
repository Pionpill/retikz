import type { BoundChart, ChartRecipe } from '../../_shared';
import type { IRBaseChart } from '../schemas';

import { BaseChartType, CHART_NAMESPACE } from '../../_shared';
import { BaseChartSchema } from '../schemas';

/** Base Chart 的恒等解析方案 */
export const BaseChartRecipe: ChartRecipe<IRBaseChart> = {
  type: BaseChartType.Base,
  schema: BaseChartSchema,
  bind: spec =>
    ({
      type: BaseChartType.Base,
      base: {
        namespace: CHART_NAMESPACE,
        type: BaseChartType.Base,
        ...(spec.id === undefined ? {} : { id: spec.id }),
        ...(spec.chartThemeTokens === undefined ? {} : { chartThemeTokens: spec.chartThemeTokens }),
        ...(spec.presentation === undefined ? {} : { presentation: spec.presentation }),
      },
      plot: spec.plot,
      createPlot: () => spec.plot,
    }) satisfies BoundChart,
};
