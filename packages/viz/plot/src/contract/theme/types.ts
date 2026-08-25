import type { ResolvedTheme } from '@retikz/core';

import type { IRPlotAxisThemeTokenRules, IRPlotThemeTokenOverrides } from '../../schemas';

/** Plot Theme style 相对默认 preset 与 Axis rules 的稀疏覆盖 */
export type PlotThemeStyleOverrides = Readonly<{
  /** 相对当前 mode 默认 preset 的稀疏 token 覆盖 */
  tokens?: IRPlotThemeTokenOverrides;
  /** 追加在默认 Axis rules 后的有序规则 */
  tokenRules?: IRPlotAxisThemeTokenRules;
}>;

/** 为完整 Core Theme 解析 Plot-owned 稀疏覆盖的运行时定义 */
export type PlotThemeStyleDefinition = Readonly<{
  name: string;
  resolve: (theme: ResolvedTheme) => PlotThemeStyleOverrides;
}>;
