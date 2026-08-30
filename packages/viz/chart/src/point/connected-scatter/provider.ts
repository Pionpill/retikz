import type { LowerPlotsOptions } from '@retikz/plot';

import type { ChartThemeDefinition } from '../../_chart/contract';
import type { ChartProviderContribution } from '../../_chart/providers';

import { createChartProviderContribution } from '../../_chart/providers';
import { ChartFamily } from '../constants';
import { ConnectedScatterChartDefinition } from './recipe';

/** 创建只安装 Connected Scatter recipe 的 provider contribution */
export const createConnectedScatterChartProviderContribution = (
  themeDefinitions: ReadonlyArray<ChartThemeDefinition> = [],
  lowerOptions: LowerPlotsOptions = {},
): ChartProviderContribution =>
  createChartProviderContribution({
    family: ChartFamily.Point,
    recipe: ConnectedScatterChartDefinition,
    themeDefinitions,
    lowerOptions,
  });
