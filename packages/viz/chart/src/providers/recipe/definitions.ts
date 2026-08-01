import type { AnyChartRecipe, ChartRecipe, InternalChartSpecBound } from './types';

import { InfrastructureChartRecipe } from './infrastructure';

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
export const BUILTIN_CHART_RECIPES = [chartRecipeOf(InfrastructureChartRecipe)] as const;
