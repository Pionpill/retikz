import type { IRChartSource } from '@retikz/chart';
import type { CoreProviderContribution } from '@retikz/core';
import { PathClipProvider } from '@retikz/extension';
import { createPlotProviderContribution } from '@retikz/plot';

import type { ChartRuntimeInput } from './types';

/**
 * 以 Chart / Plot runtime input 组装唯一依赖根
 * @template TNative 原生数据源句柄类型，关联数据绑定与执行器支持的源
 * @template TSource 当前 chartType 的精确 Chart 输入声明类型，关联 recipe 与运行时组装
 */
export const buildChartProviderContribution = <TSource extends IRChartSource, TNative>(
  input: ChartRuntimeInput<TSource, TNative>,
): CoreProviderContribution => {
  const plot = createPlotProviderContribution(input.datasets, input.lowerOptions);
  return {
    roots: [...input.chartProviderContribution.roots],
    providers: [PathClipProvider, ...plot.providers, ...input.chartProviderContribution.providers],
  };
};
