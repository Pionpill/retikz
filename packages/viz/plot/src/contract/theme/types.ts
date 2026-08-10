import type { ResolvedTheme } from '@retikz/core';

import type { IRPlotAxisThemeTokenRules, IRPlotResolvedThemeTokens } from '../../schemas';

/** Plot Theme style 解析后的基础 token 与 Axis 作用域规则 */
export type ResolvedPlotThemeStyle = Readonly<{
  /** 不区分 Axis dimension 的完整基础 token */
  tokens: IRPlotResolvedThemeTokens;
  /** 按 Axis dimension 稀疏覆盖基础 token 的有序规则 */
  tokenRules?: IRPlotAxisThemeTokenRules;
}>;

/** 为完整 Core Theme 解析 Plot-owned token 基线的运行时定义 */
export type PlotThemeStyleDefinition = Readonly<{
  name: string;
  resolve: (theme: ResolvedTheme) => ResolvedPlotThemeStyle;
}>;
