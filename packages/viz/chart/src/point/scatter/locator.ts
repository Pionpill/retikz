import type { PlotLocatorOptions } from '@retikz/plot';

import type { ChartLocatorOptions } from '../../_chart/contract';

import { qualifyChartLocatorOptions } from '../../_chart/contract';
import { ChartType } from '../constants';
import { pointRecipeId } from '../shared/plot';

/** 为 Scatter 的固定 composition identity 补全 Chart locator 条件 */
export const qualifyScatterChartLocatorOptions = (options: ChartLocatorOptions): PlotLocatorOptions =>
  qualifyChartLocatorOptions(options, {
    facet: pointRecipeId(ChartType.Scatter, 'composition.facet'),
  });
