import type { infer as ZodInfer } from 'zod';

import type {
  PlotAxisRuleSourceRecordSchema,
  PlotDefaultsSourceRecordSchema,
  PlotPaletteResolutionSchema,
  PlotThemeLayerKind,
  PlotThemeResolutionSchema,
} from './inspection';
import type {
  PlotAreaDefaultsSchema,
  PlotAxisDefaultsSchema,
  PlotColorPaletteSchema,
  PlotDefaultsSchema,
  PlotPaletteDefaultsSchema,
  PlotShapePaletteSchema,
  PlotTypographyDefaultsSchema,
} from './schema';
import type { PlotAxisRuleSchema, PlotAxisRuleSelectorSchema, PlotAxisRulesSchema } from './token-rule';

/** Plot Source 的绘图区视觉默认片段 */
export type IRPlotAreaDefaults = ZodInfer<typeof PlotAreaDefaultsSchema>;

/** Plot Source 的 Axis 视觉默认片段 */
export type IRPlotAxisDefaults = ZodInfer<typeof PlotAxisDefaultsSchema>;

/** Plot Source 的 palette 视觉默认片段 */
export type IRPlotPaletteDefaults = ZodInfer<typeof PlotPaletteDefaultsSchema>;

/** Plot Source 的全局 guide typography 视觉默认片段 */
export type IRPlotTypographyDefaults = ZodInfer<typeof PlotTypographyDefaultsSchema>;

/** Plot 数据颜色使用的有序 CSS color palette */
export type IRPlotColorPalette = ZodInfer<typeof PlotColorPaletteSchema>;

/** Plot shape 分类通道使用的有序 shape palette */
export type IRPlotShapePalette = ZodInfer<typeof PlotShapePaletteSchema>;

/** Plot Source 的稀疏视觉默认片段 */
export type IRPlotDefaults = ZodInfer<typeof PlotDefaultsSchema>;

/** Plot Source Axis rule 的 dimension selector */
export type IRPlotAxisRuleSelector = ZodInfer<typeof PlotAxisRuleSelectorSchema>;

/** Plot Source 中按 Axis dimension 应用的有序视觉规则 */
export type IRPlotAxisRule = ZodInfer<typeof PlotAxisRuleSchema>;

/** Plot Source Axis rule 列表 */
export type IRPlotAxisRules = ZodInfer<typeof PlotAxisRulesSchema>;

/** Plot defaults inspection 来源分类 */
export type PlotThemeLayerKindValue = (typeof PlotThemeLayerKind)[keyof typeof PlotThemeLayerKind];

/** 一个保留在 resolver inspection 中的 Plot defaults 来源 */
export type IRPlotDefaultsSourceRecord = ZodInfer<typeof PlotDefaultsSourceRecordSchema>;

/** 一个保留在 resolver inspection 中的 Plot Axis rule 来源 */
export type IRPlotAxisRuleSourceRecord = ZodInfer<typeof PlotAxisRuleSourceRecordSchema>;

/** Plot cascade 解析后的完整 palette */
export type IRPlotPaletteResolution = ZodInfer<typeof PlotPaletteResolutionSchema>;

/** Plot-owned defaults resolution 与 inspection 结果 */
export type IRPlotThemeResolution = ZodInfer<typeof PlotThemeResolutionSchema>;
