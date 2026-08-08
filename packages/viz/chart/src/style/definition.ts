import type { ResolvedTheme } from '@retikz/core';

import type { IRChartResolvedThemeTokens } from './types';

/** 为完整 Core Theme 解析 Chart-owned token 基线的运行时定义 */
export type ChartThemeStyleDefinition = Readonly<{
  name: string;
  resolve: (theme: ResolvedTheme) => IRChartResolvedThemeTokens;
}>;

/** 擦除泛型后的 Chart Theme style definition */
export type AnyChartThemeStyleDefinition = ChartThemeStyleDefinition;

/** 定义一个 Chart Theme style resolver */
export const defineChartThemeStyle = (definition: ChartThemeStyleDefinition): ChartThemeStyleDefinition => definition;
