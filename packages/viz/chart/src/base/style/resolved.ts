import type { ThemeModeValue, ThemeStyleValue } from '@retikz/core';

import type { ChartThemeTokenSourceRecord, IRChartResolvedThemeTokens } from './types';

/** Chart theme 解析后供 presentation 与 recipe 共享的上下文 */
export type ResolvedChartThemeContext = {
  /** effective Theme 选择的 style definition */
  style?: ThemeStyleValue;
  /** effective Theme 选择的明暗模式 */
  mode: ThemeModeValue;
  /** style baseline 与稀疏覆盖合并后的完整 Chart token */
  tokens: IRChartResolvedThemeTokens;
  /** canonical 顺序的一 token 一来源 */
  tokenSources: Array<ChartThemeTokenSourceRecord>;
};
