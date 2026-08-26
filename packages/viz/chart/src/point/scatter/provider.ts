import type { LowerPlotsOptions } from '@retikz/plot';

import type { ChartThemeDefinition } from '../../_chart/contract';
import type { ChartProviderContribution } from '../../_chart/providers';

import { createChartProviderContribution } from '../../_chart/providers';
import { ChartFamily } from '../constants';
import { ScatterChartDefinition } from './recipe';

/** 创建只安装 Scatter recipe 的 Point family provider contribution */
export const createScatterChartProviderContribution = (
  themeDefinitions: ReadonlyArray<ChartThemeDefinition> = [],
  lowerOptions: LowerPlotsOptions = {},
): ChartProviderContribution =>
  createChartProviderContribution({
    family: ChartFamily.Point,
    recipe: ScatterChartDefinition,
    themeDefinitions,
    lowerOptions,
  });
