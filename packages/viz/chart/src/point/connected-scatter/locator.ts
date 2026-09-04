import type { PlotLocatorOptions } from '@retikz/plot';

import type { ChartLocatorOptions } from '../../_chart/contract';

import { qualifyChartLocatorOptions } from '../../_chart/contract';
import { ChartType } from '../constants';
import { pointRecipeId } from '../shared/plot';

/** 为 Connected Scatter 固定 composition identity 补全 locator 条件 */
export const qualifyConnectedScatterChartLocatorOptions = (options: ChartLocatorOptions): PlotLocatorOptions =>
  qualifyChartLocatorOptions(options, { facet: pointRecipeId(ChartType.ConnectedScatter, 'composition.facet') });
