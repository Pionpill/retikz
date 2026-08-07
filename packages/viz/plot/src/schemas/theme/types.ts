import type { z } from 'zod';

import type {
  PlotStyleAuthoredOverrideRecordSchema,
  PlotStyleTokenSourceRecordSchema,
  PlotThemeResolutionSchema,
  ResolvedPlotPaletteSchema,
} from './inspection';
import type { PlotAxisThemeSchema, PlotPaletteThemeSchema, PlotThemeSchema } from './schema';
import type { PlotResolvedStyleTokensSchema, PlotStyleTokenOverridesSchema } from './style';

/** Plot 主题：JSON-safe 的全局视觉默认值 */
export type IRPlotTheme = z.infer<typeof PlotThemeSchema>;

/** Plot axis 主题默认值 */
export type IRPlotAxisTheme = z.infer<typeof PlotAxisThemeSchema>;

/** Plot palette 主题默认值 */
export type IRPlotPaletteTheme = z.infer<typeof PlotPaletteThemeSchema>;

/** 用户可稀疏覆盖的 Plot theme token */
export type IRPlotStyleTokenOverrides = z.infer<typeof PlotStyleTokenOverridesSchema>;

/** preset 与覆盖解析后的完整 Plot theme token */
export type IRPlotResolvedStyleTokens = z.infer<typeof PlotResolvedStyleTokensSchema>;

/** 单个 Plot token 的稳定来源记录 */
export type PlotStyleTokenSourceRecord = z.infer<typeof PlotStyleTokenSourceRecordSchema>;

/** Plot shorthand 或 native theme 的 authored 入口记录 */
export type PlotStyleAuthoredOverrideRecord = z.infer<typeof PlotStyleAuthoredOverrideRecordSchema>;

/** Plot cascade 解析后的完整 palette */
export type IRResolvedPlotPalette = z.infer<typeof ResolvedPlotPaletteSchema>;

/** Plot-owned theme resolution 与 inspection 结果 */
export type IRPlotThemeResolution = z.infer<typeof PlotThemeResolutionSchema>;
