import type { ValueOf } from '@retikz/foundation';
import type { z } from 'zod';

import type { ChartThemeToken, ChartThemeTokenSourceValue } from './constants';
import type { ChartResolvedThemeTokensSchema, ChartThemeSurfaceSchema, ChartThemeTokenOverridesSchema } from './schema';

/** Chart 样式 token canonical key */
export type ChartThemeTokenValue = ValueOf<typeof ChartThemeToken>;

/** 用户可稀疏覆盖的 Chart token */
export type IRChartThemeTokenOverrides = z.infer<typeof ChartThemeTokenOverridesSchema>;

/** preset 与用户覆盖解析后的完整 Chart token */
export type IRChartResolvedThemeTokens = z.infer<typeof ChartResolvedThemeTokensSchema>;

/** Chart 与转发 Plot 的共享主题输入 */
export type IRChartThemeSurface = z.infer<typeof ChartThemeSurfaceSchema>;

/** 一个 Chart token 的稳定来源记录 */
export type ChartThemeTokenSourceRecord = {
  token: ChartThemeTokenValue;
  kind: ChartThemeTokenSourceValue;
  path: string;
};
