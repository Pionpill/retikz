import type { LowerPlotsOptions } from '@retikz/plot';

import type { ChartThemeDefinition } from '../../_chart/contract';
import type { ChartProviderContribution } from '../../_chart/providers';

import { createChartProviderContribution } from '../../_chart/providers';
import { ChartFamily } from '../constants';
import { StripChartDefinition } from './recipe';

/** 创建只安装 Strip recipe 的 Point family provider contribution */
export const createStripChartProviderContribution = (
  themeDefinitions: ReadonlyArray<ChartThemeDefinition> = [],
  lowerOptions: LowerPlotsOptions = {},
): ChartProviderContribution =>
  createChartProviderContribution({
    family: ChartFamily.Point,
    recipe: StripChartDefinition,
    themeDefinitions,
    lowerOptions,
  });
