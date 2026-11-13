import type { PlotsLoweringOptions } from '@retikz/plot';

import type { ChartThemeDefinition } from '../../_chart/contract';
import type { ChartProviderContribution } from '../../_chart/providers';
import { createChartProviderContribution } from '../../_chart/providers';
import { LineChartFamily } from '../constants';
import { lineChartDefinition } from './recipe';

/** 创建只安装 Line recipe 的 provider contribution */
export const createLineChartProviderContribution = (
  chartThemeDefinitions: ReadonlyArray<ChartThemeDefinition> = [],
  lowerOptions: PlotsLoweringOptions = {},
): ChartProviderContribution =>
  createChartProviderContribution({
    family: LineChartFamily,
    recipe: lineChartDefinition,
    chartThemeDefinitions,
    lowerOptions,
  });
