import type { PlotsLoweringOptions } from '@retikz/plot';

import type { ChartThemeDefinition } from '../../_chart/contract';
import type { ChartProviderContribution } from '../../_chart/providers';
import { createChartProviderContribution } from '../../_chart/providers';
import { LineChartFamily } from '../constants';
import { slopeChartDefinition } from './recipe';

/** 创建只安装 Slope recipe 的 provider contribution */
export const createSlopeChartProviderContribution = (
  chartThemeDefinitions: ReadonlyArray<ChartThemeDefinition> = [],
  lowerOptions: PlotsLoweringOptions = {},
): ChartProviderContribution =>
  createChartProviderContribution({
    family: LineChartFamily,
    recipe: slopeChartDefinition,
    chartThemeDefinitions,
    lowerOptions,
  });
