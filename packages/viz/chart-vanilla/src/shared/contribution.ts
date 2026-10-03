import type { IRChartSource } from '@retikz/chart';
import type { CoreProviderContribution } from '@retikz/core';
import { PathClipProvider } from '@retikz/extension';
import { createPlotProviderContribution } from '@retikz/plot';

import type { ChartRuntimeInput } from './types';

/** 以 Chart / Plot runtime input 组装唯一依赖根 */
export const buildChartProviderContribution = <TSource extends IRChartSource, TNative>(
  input: ChartRuntimeInput<TSource, TNative>,
): CoreProviderContribution => {
  const plot = createPlotProviderContribution(input.datasets, input.lowerOptions);
  return {
    roots: [...input.chartProviderContribution.roots],
    providers: [PathClipProvider, ...plot.providers, ...input.chartProviderContribution.providers],
  };
};
