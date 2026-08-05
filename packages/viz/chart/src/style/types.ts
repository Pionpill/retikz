import type { ValueOf } from '@retikz/core';
import type { z } from 'zod';

import type { ChartStyleAuthoredOverrideValue, ChartStyleToken, ChartStyleTokenSourceValue } from './constants';
import type { ChartResolvedStyleTokensSchema, ChartStyleSurfaceSchema, ChartStyleTokenOverridesSchema } from './schema';

/** Chart 样式 token canonical key */
export type ChartStyleTokenValue = ValueOf<typeof ChartStyleToken>;

/** 用户可稀疏覆盖的 Chart 样式 token */
export type IRChartStyleTokenOverrides = z.infer<typeof ChartStyleTokenOverridesSchema>;

/** preset 与用户覆盖解析后的完整 Chart 样式 token */
export type IRChartResolvedStyleTokens = z.infer<typeof ChartResolvedStyleTokensSchema>;

/** Chart 共享主题输入 */
export type IRChartStyleSurface = z.infer<typeof ChartStyleSurfaceSchema>;

/** 一个 Chart token 的稳定来源记录 */
export type ChartStyleTokenSourceRecord = {
  token: ChartStyleTokenValue;
  kind: ChartStyleTokenSourceValue;
  path: string;
};

/** 一个继续参与 Plot theme cascade 的用户覆盖记录 */
export type ChartStyleAuthoredOverrideRecord = {
  kind: ChartStyleAuthoredOverrideValue;
  path: string;
};
