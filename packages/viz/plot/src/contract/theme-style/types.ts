import type { ResolvedTheme } from '@retikz/core';

import type { IRPlotResolvedThemeTokens } from '../../schemas';

/** 为完整 Core Theme 解析 Plot-owned token 基线的运行时定义 */
export type PlotThemeStyleDefinition = Readonly<{
  name: string;
  resolve: (theme: ResolvedTheme) => IRPlotResolvedThemeTokens;
}>;

/** 擦除泛型后的 Plot Theme style definition */
export type AnyPlotThemeStyleDefinition = PlotThemeStyleDefinition;
