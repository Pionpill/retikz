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
import { PlotStyleToken } from './constants';

/** Plot 数据颜色使用的非空有序 CSS color palette */
export const PlotColorPaletteSchema = z.array(CssColorSchema).min(1).describe('Non-empty ordered Plot color palette.');

/** Plot 主题 token 的唯一字段契约 */
export const PlotStyleTokenFieldShape = {
  [PlotStyleToken.PlotSurfaceFill]: PaintValueSchema.describe('Plot panel surface fill paint'),
  [PlotStyleToken.PlotTypographyForeground]: CssColorSchema.describe('Global Plot guide foreground color'),
  [PlotStyleToken.PlotTypographyFontFamily]: FontFamilySchema.describe('Global Plot guide font family'),
  [PlotStyleToken.PlotTypographyFontSize]: FontSizeSchema.describe('Global Plot guide font size'),
  [PlotStyleToken.PlotLabelForeground]: CssColorSchema.describe('Plot label foreground color'),
  [PlotStyleToken.PlotLabelFontSize]: FontSizeSchema.describe('Plot label font size'),
  [PlotStyleToken.AxisLineEnabled]: z.boolean().describe('Whether existing Plot axes show baselines by default'),
  [PlotStyleToken.AxisLineStroke]: PaintValueSchema.describe('Axis baseline stroke paint'),
  [PlotStyleToken.AxisLineStrokeWidth]: StrokeWidthSchema.describe('Axis baseline stroke width'),
  [PlotStyleToken.AxisLineDrawOpacity]: OpacitySchema.describe('Axis baseline draw opacity'),
  [PlotStyleToken.AxisTickMark]: AxisTickMarkSchema.describe('Axis tick mark glyph and style'),
  [PlotStyleToken.AxisTickLabelEnabled]: z.boolean().describe('Whether axis tick labels are visible by default'),
  [PlotStyleToken.AxisTickLabelForeground]: CssColorSchema.describe('Axis tick label foreground color'),
  [PlotStyleToken.AxisTickLabelFontSize]: FontSizeSchema.describe('Axis tick label font size'),
  [PlotStyleToken.AxisTickLabelGap]: AxisTickLabelGapSchema.describe('Gap from axis ticks to labels'),
  [PlotStyleToken.AxisTitleForeground]: CssColorSchema.describe('Axis title foreground color'),
  [PlotStyleToken.AxisTitleFontSize]: FontSizeSchema.describe('Axis title font size'),
  [PlotStyleToken.AxisTitleFontWeight]: FontWeightSchema.describe('Axis title font weight'),
  [PlotStyleToken.AxisGridStroke]: PaintValueSchema.describe('Axis grid stroke paint'),
  [PlotStyleToken.AxisGridStrokeWidth]: StrokeWidthSchema.describe('Axis grid stroke width'),
  [PlotStyleToken.AxisGridDrawOpacity]: OpacitySchema.describe('Axis grid draw opacity'),
  [PlotStyleToken.LegendTitleForeground]: CssColorSchema.describe('Legend title foreground color'),
  [PlotStyleToken.LegendTitleFontSize]: FontSizeSchema.describe('Legend title font size'),
  [PlotStyleToken.LegendTitleFontWeight]: FontWeightSchema.describe('Legend title font weight'),
  [PlotStyleToken.LegendLabelForeground]: CssColorSchema.describe('Legend label foreground color'),
  [PlotStyleToken.LegendLabelFontSize]: FontSizeSchema.describe('Legend label font size'),
  [PlotStyleToken.LegendSwatchSize]: LegendSwatchSizeSchema.describe('Legend swatch size'),
  [PlotStyleToken.LegendSwatchGap]: LegendLayoutGapSchema.describe('Legend swatch-to-label gap'),
  [PlotStyleToken.LegendEntryGap]: LegendLayoutGapSchema.describe('Legend entry gap'),
  [PlotStyleToken.LegendTitleGap]: LegendLayoutGapSchema.describe('Legend title-to-body gap'),
  [PlotStyleToken.LegendRampLength]: LegendRampLengthSchema.describe('Legend ramp length'),
  [PlotStyleToken.LegendRampThickness]: LegendRampThicknessSchema.describe('Legend ramp thickness'),
  [PlotStyleToken.LegendSymbolSize]: LegendSymbolSizeSchema.describe('Legend symbol box size'),
  [PlotStyleToken.LegendSymbolScale]: LegendSymbolScaleSchema.describe('Legend symbol scale'),
  [PlotStyleToken.LegendSymbolFit]: LegendGuideStyleSchema.shape.symbolFit.unwrap().describe('Legend symbol fit'),
  [PlotStyleToken.PlotPaletteCategorical]: PlotColorPaletteSchema.describe('Categorical scale palette'),
  [PlotStyleToken.PlotPaletteSeries]: PlotColorPaletteSchema.describe('Mark and series palette'),
  [PlotStyleToken.PlotPaletteSector]: PlotColorPaletteSchema.describe('Sector mark palette'),
  [PlotStyleToken.PlotPaletteSequential]: ColorSchemeNameSchema.describe('Sequential color scheme name'),
  [PlotStyleToken.PlotPaletteDiverging]: ColorSchemeNameSchema.describe('Diverging color scheme name'),
} as const;

/** 用户可稀疏覆盖的严格 Plot token map */
export const PlotStyleTokenOverridesSchema = z
  .strictObject(PlotStyleTokenFieldShape)
  .partial()
  .superRefine((overrides, context) => {
    for (const token of Object.values(PlotStyleToken)) {
      if (Object.hasOwn(overrides, token) && overrides[token] === undefined) {
        context.addIssue({
          code: 'custom',
          path: [token],
          message: 'Plot style token overrides must omit unset values instead of using undefined',
        });
      }
    }
  })
  .describe('Sparse strict overrides for canonical Plot style tokens');

/** preset 与用户覆盖解析后的完整 Plot token map */
export const PlotResolvedStyleTokensSchema = z
  .strictObject(PlotStyleTokenFieldShape)
  .describe('Complete resolved map of canonical Plot style tokens');
