import type { infer as ZodInfer } from 'zod';

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
export type IRPlotTheme = ZodInfer<typeof PlotThemeSchema>;

/** Plot axis 主题默认值 */
export type IRPlotAxisTheme = ZodInfer<typeof PlotAxisThemeSchema>;

/** Plot palette 主题默认值 */
export type IRPlotPaletteTheme = ZodInfer<typeof PlotPaletteThemeSchema>;

/** 用户可稀疏覆盖的 Plot theme token */
export type IRPlotThemeTokenOverrides = ZodInfer<typeof PlotThemeTokenOverridesSchema>;

/** Axis scoped rule 可稀疏覆盖的 Plot theme token */
export type IRPlotAxisThemeTokenOverrides = ZodInfer<typeof PlotAxisThemeTokenOverridesSchema>;

/** Axis theme token rule 的 dimension selector */
export type IRPlotAxisThemeTokenSelector = ZodInfer<typeof PlotAxisThemeTokenSelectorSchema>;

/** 单条 Axis theme token 作用域规则 */
export type IRPlotAxisThemeTokenRule = ZodInfer<typeof PlotAxisThemeTokenRuleSchema>;

/** 有序 Axis theme token 作用域规则列表 */
export type IRPlotAxisThemeTokenRules = ZodInfer<typeof PlotAxisThemeTokenRulesSchema>;

/** preset 与覆盖解析后的完整 Plot theme token */
export type IRPlotThemeTokenResolution = ZodInfer<typeof PlotThemeTokenResolutionSchema>;

/** 单个 Plot token 的稳定来源 IR 记录 */
export type IRPlotThemeTokenSourceRecord = ZodInfer<typeof PlotThemeTokenSourceRecordSchema>;

/** 单条 Axis theme token rule 的稳定来源 IR 记录 */
export type IRPlotThemeTokenRuleSourceRecord = ZodInfer<typeof PlotThemeTokenRuleSourceRecordSchema>;

/** Plot shorthand 或 native theme 的 authored 入口 IR 记录 */
export type IRPlotThemeAuthoredOverrideRecord = ZodInfer<typeof PlotThemeAuthoredOverrideRecordSchema>;

/** Plot cascade 解析后的完整 palette */
export type IRPlotPaletteResolution = ZodInfer<typeof PlotPaletteResolutionSchema>;

/** Plot-owned theme resolution 与 inspection 结果 */
export type IRPlotThemeResolution = ZodInfer<typeof PlotThemeResolutionSchema>;
