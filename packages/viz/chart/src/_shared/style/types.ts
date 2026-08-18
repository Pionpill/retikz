import type { ThemeTokenSourceValue } from '@retikz/core';
import type { ValueOf } from '@retikz/foundation';
import type { z } from 'zod';

import type { ChartThemeToken } from './constants';
import type { ChartResolvedThemeTokensSchema, ChartThemeSurfaceSchema, ChartThemeTokenOverridesSchema } from './schema';

/** Chart 样式令牌的确定键 */
export type ChartThemeTokenValue = ValueOf<typeof ChartThemeToken>;

/** 用户可稀疏覆盖的 Chart 令牌 */
export type IRChartThemeTokenOverrides = z.infer<typeof ChartThemeTokenOverridesSchema>;

/** 预设与用户覆盖解析后的完整 Chart 令牌 */
export type IRChartResolvedThemeTokens = z.infer<typeof ChartResolvedThemeTokensSchema>;

/** Chart 与转发 Plot 的共享主题输入 */
export type IRChartThemeSurface = z.infer<typeof ChartThemeSurfaceSchema>;

/** 一个 Chart 令牌的稳定来源记录 */
export type ChartThemeTokenSourceRecord = {
  token: ChartThemeTokenValue;
  kind: ThemeTokenSourceValue;
  path: string;
};
