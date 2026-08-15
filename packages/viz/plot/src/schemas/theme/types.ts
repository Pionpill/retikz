import type { z } from 'zod';

import type {
  PlotPaletteResolutionSchema,
  PlotThemeAuthoredOverrideRecordSchema,
  PlotThemeResolutionSchema,
  PlotThemeTokenRuleSourceRecordSchema,
  PlotThemeTokenSourceRecordSchema,
} from './inspection';
import type { PlotAxisThemeSchema, PlotPaletteThemeSchema, PlotThemeSchema } from './schema';
import type {
  PlotAxisThemeTokenOverridesSchema,
  PlotThemeTokenOverridesSchema,
  PlotThemeTokenResolutionSchema,
} from './style';
import type {
  PlotAxisThemeTokenRuleSchema,
  PlotAxisThemeTokenRulesSchema,
  PlotAxisThemeTokenSelectorSchema,
} from './token-rule';

/** Plot 主题：JSON-safe 的全局视觉默认值 */
export type IRPlotTheme = z.infer<typeof PlotThemeSchema>;

/** Plot axis 主题默认值 */
export type IRPlotAxisTheme = z.infer<typeof PlotAxisThemeSchema>;

/** Plot palette 主题默认值 */
export type IRPlotPaletteTheme = z.infer<typeof PlotPaletteThemeSchema>;

/** 用户可稀疏覆盖的 Plot theme token */
export type IRPlotThemeTokenOverrides = z.infer<typeof PlotThemeTokenOverridesSchema>;

/** Axis scoped rule 可稀疏覆盖的 Plot theme token */
export type IRPlotAxisThemeTokenOverrides = z.infer<typeof PlotAxisThemeTokenOverridesSchema>;

/** Axis theme token rule 的 dimension selector */
export type IRPlotAxisThemeTokenSelector = z.infer<typeof PlotAxisThemeTokenSelectorSchema>;

/** 单条 Axis theme token 作用域规则 */
export type IRPlotAxisThemeTokenRule = z.infer<typeof PlotAxisThemeTokenRuleSchema>;

/** 有序 Axis theme token 作用域规则列表 */
export type IRPlotAxisThemeTokenRules = z.infer<typeof PlotAxisThemeTokenRulesSchema>;

/** preset 与覆盖解析后的完整 Plot theme token */
export type IRPlotThemeTokenResolution = z.infer<typeof PlotThemeTokenResolutionSchema>;

/** 单个 Plot token 的稳定来源 IR 记录 */
export type IRPlotThemeTokenSourceRecord = z.infer<typeof PlotThemeTokenSourceRecordSchema>;

/** 单条 Axis theme token rule 的稳定来源 IR 记录 */
export type IRPlotThemeTokenRuleSourceRecord = z.infer<typeof PlotThemeTokenRuleSourceRecordSchema>;

/** Plot shorthand 或 native theme 的 authored 入口 IR 记录 */
export type IRPlotThemeAuthoredOverrideRecord = z.infer<typeof PlotThemeAuthoredOverrideRecordSchema>;

/** Plot cascade 解析后的完整 palette */
export type IRPlotPaletteResolution = z.infer<typeof PlotPaletteResolutionSchema>;

/** Plot-owned theme resolution 与 inspection 结果 */
export type IRPlotThemeResolution = z.infer<typeof PlotThemeResolutionSchema>;
