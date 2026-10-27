import type { PlotsLoweringOptions } from '@retikz/plot';

import type { ChartThemeDefinition } from '../../_chart/contract';
import type { ChartProviderContribution } from '../../_chart/providers';
import { createChartProviderContribution } from '../../_chart/providers';
import { ChartFamily } from '../constants';
import { regressionChartDefinition } from './recipe';

/** 创建只安装 Regression recipe 的 Point family provider contribution */
export const createRegressionChartProviderContribution = (
  chartThemeDefinitions: ReadonlyArray<ChartThemeDefinition> = [],
  lowerOptions: PlotsLoweringOptions = {},
): ChartProviderContribution =>
  createChartProviderContribution({
    family: ChartFamily.Point,
    recipe: regressionChartDefinition,
    chartThemeDefinitions,
    lowerOptions,
  });
