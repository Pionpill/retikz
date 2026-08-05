import type { ThemeModeValue, ThemeStyleValue } from '@retikz/core';
import type { IRPlotTheme } from '@retikz/plot';

import type {
  ChartStyleAuthoredOverrideRecord,
  ChartStyleTokenSourceRecord,
  IRChartResolvedStyleTokens,
} from './types';

/** Chart theme 解析后供 recipe、Plot mapping 与 inspection 共享的上下文 */
export type ResolvedChartStyleContext = {
  /** 采用的内建 preset */
  style: ThemeStyleValue;
  /** 采用的明暗模式 */
  themeMode: ThemeModeValue;
  /** preset 与稀疏覆盖合并后的完整 token */
  tokens: IRChartResolvedStyleTokens;
  /** canonical 顺序的一 token 一来源 */
  tokenSources: Array<ChartStyleTokenSourceRecord>;
  /** 用户编写的 Plot palette/theme 覆盖入口 */
  authoredOverrides: Array<ChartStyleAuthoredOverrideRecord>;
};

/** Chart token 投影到 Plot 正式 theme 后的类型 */
export type ChartPlotTheme = IRPlotTheme;
