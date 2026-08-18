import type { ResolvedTheme } from '@retikz/core';

import type { IRChartResolvedThemeTokens } from '../../_shared/style';

/** 为完整 Core 主题解析 Chart 自有令牌基线的运行时定义 */
export type ChartThemeStyleDefinition = Readonly<{
  name: string;
  resolve: (theme: ResolvedTheme) => IRChartResolvedThemeTokens;
}>;

/** 定义一个 Chart 主题样式解析器 */
export const defineChartThemeStyle = (definition: ChartThemeStyleDefinition): ChartThemeStyleDefinition => definition;
