import type { AnyChartRecipe, ChartRecipe, InternalChartSpecBound } from './recipe';

import { BubbleChartRecipe } from './bubble';
import { ConnectedScatterChartRecipe } from './connected-scatter';
import { ScatterChartRecipe } from './scatter';

/** 把具体 variant recipe 绑定为异构 tuple 可统一消费的闭包表面 */
export const chartRecipeOf = <TSpec extends InternalChartSpecBound>(recipe: ChartRecipe<TSpec>): AnyChartRecipe => ({
  type: recipe.type,
  bind: input => {
    const spec = recipe.schema.parse(input);
    return {
      spec,
      createSeed: style => recipe.createSeed(spec, style),
      validateCore: plotSpec => recipe.validateCore(spec, plotSpec),
    };
  },
});

/** 当前版本封闭的内建 Chart recipe tuple */
export const BUILTIN_POINT_CHART_RECIPES = [
  chartRecipeOf(ScatterChartRecipe),
  chartRecipeOf(BubbleChartRecipe),
  chartRecipeOf(ConnectedScatterChartRecipe),
] as const;
