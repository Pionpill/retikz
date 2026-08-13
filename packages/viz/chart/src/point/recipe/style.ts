import type { ResolvedChartThemeContext } from '../../base/style';
import type { ChartRecipeStyleContext } from './recipe';

import { ChartThemeToken } from '../../base/style';

/** 从 Chart token 与 Plot palette 收敛出 Point recipe 可读取的表现默认值 */
export const pointChartRecipeStyleContextOf = (
  context: ResolvedChartThemeContext,
  seriesColor: string,
): ChartRecipeStyleContext => ({
  axisEnabled: context.tokens[ChartThemeToken.ChartAxisEnabled],
  axisGridEnabled: context.tokens[ChartThemeToken.ChartAxisGridEnabled],
  legendEnabled: context.tokens[ChartThemeToken.ChartLegendEnabled],
  seriesColor,
});
