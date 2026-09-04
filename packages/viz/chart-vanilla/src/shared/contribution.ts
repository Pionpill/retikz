import type { IRChartSource } from '@retikz/chart';
import type { CoreProviderContribution } from '@retikz/core';

import { createPlotProviderContribution } from '@retikz/plot';
import { PathClipProvider } from '@retikz/standard/clip';

import type { ChartAuthoringResult, ChartHostThemeInput, ChartInput } from './types';

/** 以 Chart / Plot runtime input 组装唯一依赖根 */
export const buildChartProviderContribution = <TSource extends IRChartSource>(
  input: ChartInput<TSource>,
): CoreProviderContribution => {
  const plot = createPlotProviderContribution(input.datasets, input.lowerOptions);
  return {
    roots: [...input.chartProviderContribution.roots],
    providers: [PathClipProvider, ...plot.providers, ...input.chartProviderContribution.providers],
  };
};

/** 组装可供 adapter 与 standalone SSR 共用的 Chart authoring result */
export const createChartAuthoringResult = <TSource extends IRChartSource>(
  input: ChartInput<TSource>,
  host: ChartHostThemeInput = {},
): ChartAuthoringResult<TSource> => ({
  source: input.source,
  input,
  contribution: buildChartProviderContribution(input),
  ...(host.theme === undefined ? {} : { theme: host.theme }),
  ...(host.themeStyles === undefined ? {} : { themeStyles: host.themeStyles }),
});
