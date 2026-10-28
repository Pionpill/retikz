import type { PlotsLoweringOptions } from '@retikz/plot';

import type { ChartThemeDefinition } from '../../_chart/contract';
import type { ChartProviderContribution } from '../../_chart/providers';
import { createChartProviderContribution } from '../../_chart/providers';
import { ChartFamily } from '../constants';
import { connectedScatterChartDefinition } from './recipe';

/** 创建只安装 Connected Scatter recipe 的 provider contribution */
export const createConnectedScatterChartProviderContribution = (
  chartThemeDefinitions: ReadonlyArray<ChartThemeDefinition> = [],
  lowerOptions: PlotsLoweringOptions = {},
): ChartProviderContribution =>
  createChartProviderContribution({
    family: ChartFamily.Point,
    recipe: connectedScatterChartDefinition,
    chartThemeDefinitions,
    lowerOptions,
  });
