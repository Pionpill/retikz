import type { IRPlot } from '@retikz/plot';
import type { ZodType } from 'zod';

import type { IRChartPresentation } from '../presentation';
import type { IRChartPlot } from '../schemas';
import type { IRChartThemeTokenOverrides } from '../style';

import { BaseChartType, CHART_NAMESPACE } from '../constants';

/** 类型解析方案绑定后保留的 Base Chart 外层字段 */
export type BoundChartBase = Readonly<{
  namespace: typeof CHART_NAMESPACE;
  type: typeof BaseChartType.Base;
  id?: string;
  chartThemeTokens?: IRChartThemeTokenOverrides;
  presentation?: IRChartPresentation;
}>;

/** 具体 Chart 数据结构可交给解析方案的共同结构 */
export type ChartRecipeSource = Readonly<{
  namespace: typeof CHART_NAMESPACE;
  type: string;
  id?: string;
  chartThemeTokens?: IRChartThemeTokenOverrides;
  presentation?: IRChartPresentation;
  plot: IRChartPlot;
}>;

/** 类型解析方案可读取的表现默认值 */
export type ChartRecipeStyleContext = {
  axisEnabled: boolean;
  axisGridEnabled: boolean;
  legendEnabled: boolean;
  seriesColor: string;
};

/** 具体 Chart 与对应解析行为的内部绑定 */
export type BoundChart = Readonly<{
  type: string;
  base: BoundChartBase;
  plot: IRChartPlot | IRPlot;
  createPlot: (style: ChartRecipeStyleContext) => IRPlot;
}>;

/** 保留具体源 IR 类型的 Chart 解析方案 */
export type ChartRecipe<TVariant extends ChartRecipeSource> = Readonly<{
  type: TVariant['type'];
  schema: ZodType<TVariant>;
  bind: (spec: TVariant) => BoundChart;
}>;

/** 已擦除具体源 IR 类型的内部分发解析方案 */
export type AnyChartRecipe = Readonly<{
  type: string;
  parseAndBind: (input: unknown) => BoundChart;
}>;

/** 将具体 Chart 源 IR 外层绑定为统一的内部 Base 目标 */
export const bindChartRecipe = <TVariant extends ChartRecipeSource>(
  spec: TVariant,
  createPlot: (spec: TVariant, style: ChartRecipeStyleContext) => IRPlot,
): BoundChart => ({
  type: spec.type,
  base: {
    namespace: CHART_NAMESPACE,
    type: BaseChartType.Base,
    ...(spec.id === undefined ? {} : { id: spec.id }),
    ...(spec.chartThemeTokens === undefined ? {} : { chartThemeTokens: spec.chartThemeTokens }),
    ...(spec.presentation === undefined ? {} : { presentation: spec.presentation }),
  },
  plot: spec.plot,
  createPlot: style => createPlot(spec, style),
});

/** 用数据结构与具体类型解析方案建立未知输入的分发闭包 */
export const chartRecipeOf = <TVariant extends ChartRecipeSource>(recipe: ChartRecipe<TVariant>): AnyChartRecipe => ({
  type: recipe.type,
  parseAndBind: input => recipe.bind(recipe.schema.parse(input)),
});
