import type { ValueOf } from '@retikz/core';
import type { z } from 'zod';

import type { ChartStyle, ChartStyleToken, ChartThemeMode } from './constants';
import type { ChartResolvedStyleTokensSchema, ChartStyleSurfaceSchema, ChartStyleTokenOverridesSchema } from './schema';

/** Chart 内建视觉人格取值 */
export type ChartStyleValue = ValueOf<typeof ChartStyle>;

/** Chart 主题明暗模式取值 */
export type ChartThemeModeValue = ValueOf<typeof ChartThemeMode>;

/** Chart 样式 token canonical key */
export type ChartStyleTokenValue = ValueOf<typeof ChartStyleToken>;

/** 用户可稀疏覆盖的 Chart 样式 token */
export type IRChartStyleTokenOverrides = z.infer<typeof ChartStyleTokenOverridesSchema>;

/** preset 与用户覆盖解析后的完整 Chart 样式 token */
export type IRChartResolvedStyleTokens = z.infer<typeof ChartResolvedStyleTokensSchema>;

/** Chart 共享主题输入 */
export type IRChartStyleSurface = z.infer<typeof ChartStyleSurfaceSchema>;
