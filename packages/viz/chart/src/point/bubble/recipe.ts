import type { ChartRecipe } from '../../_shared';
import type { IRBubbleChart } from './schema';

import { bindChartRecipe } from '../../_shared';
import { PointChartType } from '../constants';
import { createPointChartPlot } from '../shared';
import { BubbleChartSchema } from './schema';

const bubbleRecipeOptions = {
  type: PointChartType.Bubble,
  finalSizeFieldOf: (spec: IRBubbleChart): { field: string; scale?: string } => spec.config.encoding.size,
};

/** Bubble 具体类型的内建解析方案 */
export const BubbleChartRecipe: ChartRecipe<IRBubbleChart> = {
  type: PointChartType.Bubble,
  schema: BubbleChartSchema,
  bind: spec => bindChartRecipe(spec, (value, style) => createPointChartPlot(value, style, bubbleRecipeOptions)),
};
