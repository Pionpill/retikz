import type { IRChartSource } from '@retikz/chart';
import type { IRScene, ThemeStyleDefinition } from '@retikz/core';

import { createPlotProviderContribution } from '@retikz/plot';
import { PathClipProvider } from '@retikz/standard/clip';

import type { ChartAuthoringResult, ChartInput } from './types';

/** 以 Chart / Plot runtime input 组装唯一依赖根 */
export const chartContributionOf = <TSource extends IRChartSource>(
  input: ChartInput<TSource>,
  theme: IRScene['theme'] | undefined = undefined,
  themeStyles: ReadonlyArray<ThemeStyleDefinition> | undefined = undefined,
): ChartAuthoringResult<TSource> => {
  const plot = createPlotProviderContribution(input.datasets, input.lowerOptions);
  return {
    source: input.source,
    input,
    contribution: {
      roots: [...input.chartProviderContribution.roots],
      providers: [PathClipProvider, ...plot.providers, ...input.chartProviderContribution.providers],
    },
    ...(theme === undefined ? {} : { theme }),
    ...(themeStyles === undefined ? {} : { themeStyles }),
  };
};
