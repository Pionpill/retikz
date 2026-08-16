import type { ChartRecipeStyleContext } from '../../_shared/recipe';
import type { ResolvedChartThemeContext } from '../style';

import { ChartThemeToken } from '../../_shared/style';

/** 从 Chart 令牌与 Plot 调色板收敛出 Point 类型解析方案可读取的表现默认值 */
export const chartRecipeStyleContextOf = (
  context: ResolvedChartThemeContext,
  seriesColor: string,
): ChartRecipeStyleContext => ({
  axisEnabled: context.tokens[ChartThemeToken.ChartAxisEnabled],
  axisGridEnabled: context.tokens[ChartThemeToken.ChartAxisGridEnabled],
  legendEnabled: context.tokens[ChartThemeToken.ChartLegendEnabled],
  seriesColor,
});
