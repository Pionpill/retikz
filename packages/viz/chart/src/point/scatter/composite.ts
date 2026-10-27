import type { PlotsLoweringOptions } from '@retikz/plot';

import type { ChartThemeDefinition } from '../../_chart/contract';
import type { ChartProviderContribution } from '../../_chart/providers';
import { createChartProviderContribution } from '../../_chart/providers';
import { ChartFamily } from '../constants';
import { scatterChartDefinition } from './recipe';

/** 创建只安装 Scatter recipe 的 Point family provider contribution */
export const createScatterChartProviderContribution = (
  chartThemeDefinitions: ReadonlyArray<ChartThemeDefinition> = [],
  lowerOptions: PlotsLoweringOptions = {},
): ChartProviderContribution =>
  createChartProviderContribution({
    family: ChartFamily.Point,
    recipe: scatterChartDefinition,
    chartThemeDefinitions,
    lowerOptions,
  });
