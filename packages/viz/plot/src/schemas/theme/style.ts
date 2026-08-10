import {
  CssColorSchema,
  FontFamilySchema,
  FontSizeSchema,
  FontWeightSchema,
  OpacitySchema,
  PaintValueSchema,
  StrokeWidthSchema,
} from '@retikz/core';
import { z } from 'zod';

import {
  AxisTickLabelGapSchema,
  AxisTickMarkSchema,
  LegendGuideStyleSchema,
  LegendLayoutGapSchema,
  LegendRampLengthSchema,
  LegendRampThicknessSchema,
  LegendSwatchSizeSchema,
  LegendSymbolScaleSchema,
  LegendSymbolSizeSchema,
} from '../guide';
import { ColorSchemeNameSchema } from '../scale';
import { PlotThemeToken } from './constants';

/** Plot 数据颜色使用的非空有序 CSS color palette */
export const PlotColorPaletteSchema = z.array(CssColorSchema).min(1).describe('Non-empty ordered Plot color palette.');

/** Plot 主题 token 的唯一字段契约 */
export const PlotThemeTokenFieldShape = {
  [PlotThemeToken.PlotAreaFill]: PaintValueSchema.describe('Plot area background fill paint'),
  [PlotThemeToken.PlotTypographyForeground]: CssColorSchema.describe('Global Plot guide foreground color'),
  [PlotThemeToken.PlotTypographyFontFamily]: FontFamilySchema.describe('Global Plot guide font family'),
  [PlotThemeToken.PlotTypographyFontSize]: FontSizeSchema.describe('Global Plot guide font size'),
  [PlotThemeToken.AxisLineEnabled]: z.boolean().describe('Whether existing Plot axes show baselines by default'),
  [PlotThemeToken.AxisLineStroke]: PaintValueSchema.describe('Axis baseline stroke paint'),
  [PlotThemeToken.AxisLineStrokeWidth]: StrokeWidthSchema.describe('Axis baseline stroke width'),
  [PlotThemeToken.AxisLineDrawOpacity]: OpacitySchema.describe('Axis baseline draw opacity'),
  [PlotThemeToken.AxisTickMark]: AxisTickMarkSchema.describe('Axis tick mark glyph and style'),
  [PlotThemeToken.AxisTickLabelEnabled]: z.boolean().describe('Whether axis tick labels are visible by default'),
  [PlotThemeToken.AxisTickLabelForeground]: CssColorSchema.describe('Axis tick label foreground color'),
  [PlotThemeToken.AxisTickLabelFontSize]: FontSizeSchema.describe('Axis tick label font size'),
  [PlotThemeToken.AxisTickLabelGap]: AxisTickLabelGapSchema.describe('Gap from axis ticks to labels'),
  [PlotThemeToken.AxisTitleForeground]: CssColorSchema.describe('Axis title foreground color'),
  [PlotThemeToken.AxisTitleFontSize]: FontSizeSchema.describe('Axis title font size'),
  [PlotThemeToken.AxisTitleFontWeight]: FontWeightSchema.describe('Axis title font weight'),
  [PlotThemeToken.AxisGridStroke]: PaintValueSchema.describe('Axis grid stroke paint'),
  [PlotThemeToken.AxisGridStrokeWidth]: StrokeWidthSchema.describe('Axis grid stroke width'),
  [PlotThemeToken.AxisGridDrawOpacity]: OpacitySchema.describe('Axis grid draw opacity'),
  [PlotThemeToken.LegendTitleForeground]: CssColorSchema.describe('Legend title foreground color'),
  [PlotThemeToken.LegendTitleFontSize]: FontSizeSchema.describe('Legend title font size'),
  [PlotThemeToken.LegendTitleFontWeight]: FontWeightSchema.describe('Legend title font weight'),
  [PlotThemeToken.LegendLabelForeground]: CssColorSchema.describe('Legend label foreground color'),
  [PlotThemeToken.LegendLabelFontSize]: FontSizeSchema.describe('Legend label font size'),
  [PlotThemeToken.LegendSwatchSize]: LegendSwatchSizeSchema.describe('Legend swatch size'),
  [PlotThemeToken.LegendSwatchGap]: LegendLayoutGapSchema.describe('Legend swatch-to-label gap'),
  [PlotThemeToken.LegendEntryGap]: LegendLayoutGapSchema.describe('Legend entry gap'),
  [PlotThemeToken.LegendTitleGap]: LegendLayoutGapSchema.describe('Legend title-to-body gap'),
  [PlotThemeToken.LegendRampLength]: LegendRampLengthSchema.describe('Legend ramp length'),
  [PlotThemeToken.LegendRampThickness]: LegendRampThicknessSchema.describe('Legend ramp thickness'),
  [PlotThemeToken.LegendSymbolSize]: LegendSymbolSizeSchema.describe('Legend symbol box size'),
  [PlotThemeToken.LegendSymbolScale]: LegendSymbolScaleSchema.describe('Legend symbol scale'),
  [PlotThemeToken.LegendSymbolFit]: LegendGuideStyleSchema.shape.symbolFit.unwrap().describe('Legend symbol fit'),
  [PlotThemeToken.PlotPaletteCategorical]: PlotColorPaletteSchema.describe('Categorical scale palette'),
  [PlotThemeToken.PlotPaletteSeries]: PlotColorPaletteSchema.describe('Mark and series palette'),
  [PlotThemeToken.PlotPaletteSector]: PlotColorPaletteSchema.describe('Sector mark palette'),
  [PlotThemeToken.PlotPaletteSequential]: ColorSchemeNameSchema.describe('Sequential color scheme name'),
  [PlotThemeToken.PlotPaletteDiverging]: ColorSchemeNameSchema.describe('Diverging color scheme name'),
} as const;

/** 用户可稀疏覆盖的严格 Plot token map */
export const PlotThemeTokenOverridesSchema = z
  .strictObject(PlotThemeTokenFieldShape)
  .partial()
  .superRefine((overrides, context) => {
    for (const token of Object.values(PlotThemeToken)) {
      if (Object.hasOwn(overrides, token) && overrides[token] === undefined) {
        context.addIssue({
          code: 'custom',
          path: [token],
          message: 'Plot theme token overrides must omit unset values instead of using undefined',
        });
      }
    }
  })
  .describe('Sparse strict overrides for canonical Plot theme tokens');

/** preset 与用户覆盖解析后的完整 Plot token map */
export const PlotResolvedThemeTokensSchema = z
  .strictObject(PlotThemeTokenFieldShape)
  .describe('Complete resolved map of canonical Plot theme tokens');
