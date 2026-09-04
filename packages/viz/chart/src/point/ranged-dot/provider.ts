import type { LowerPlotsOptions } from '@retikz/plot';

import type { ChartThemeDefinition } from '../../_chart/contract';
import type { ChartProviderContribution } from '../../_chart/providers';

import { createChartProviderContribution } from '../../_chart/providers';
import { ChartFamily } from '../constants';
import { RangedDotChartDefinition } from './recipe';

/** 创建只安装 Ranged Dot recipe 的 provider contribution */
export const createRangedDotChartProviderContribution = (
  themeDefinitions: ReadonlyArray<ChartThemeDefinition> = [],
  lowerOptions: LowerPlotsOptions = {},
): ChartProviderContribution =>
  createChartProviderContribution({
    family: ChartFamily.Point,
    recipe: RangedDotChartDefinition,
    themeDefinitions,
    lowerOptions,
  });
