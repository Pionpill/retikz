import type { PlotsLoweringOptions } from '@retikz/plot';

import type { ChartThemeDefinition } from '../../_chart/contract';
import type { ChartProviderContribution } from '../../_chart/providers';
import { createChartProviderContribution } from '../../_chart/providers';
import { ChartFamily } from '../constants';
import { stripChartDefinition } from './recipe';

/** 创建只安装 Strip recipe 的 Point family provider contribution */
export const createStripChartProviderContribution = (
  chartThemeDefinitions: ReadonlyArray<ChartThemeDefinition> = [],
  lowerOptions: PlotsLoweringOptions = {},
): ChartProviderContribution =>
  createChartProviderContribution({
    family: ChartFamily.Point,
    recipe: stripChartDefinition,
    chartThemeDefinitions,
    lowerOptions,
  });
