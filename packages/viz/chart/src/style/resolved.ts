import type { ThemeModeValue, ThemeStyleValue } from '@retikz/core';

import type { ChartStyleTokenSourceRecord, IRChartResolvedStyleTokens } from './types';

/** Chart theme 解析后供 presentation、recipe 与 inspection 共享的上下文 */
export type ResolvedChartStyleContext = {
  /** effective Theme 选择的内建 preset */
  style: ThemeStyleValue;
  /** effective Theme 选择的明暗模式 */
  mode: ThemeModeValue;
  /** preset 与稀疏覆盖合并后的完整 Chart token */
  tokens: IRChartResolvedStyleTokens;
  /** canonical 顺序的一 token 一来源 */
  tokenSources: Array<ChartStyleTokenSourceRecord>;
};
