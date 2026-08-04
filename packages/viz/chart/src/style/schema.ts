import { FontSchema, FontSizeSchema, NodeSchema } from '@retikz/core';
import {
  AxisGridLineStyleSchema,
  AxisLineStyleSchema,
  AxisTickLabelsSchema,
  AxisTickMarkSchema,
  LegendGuideStyleSchema,
  PlotSpecSchema,
} from '@retikz/plot';
import { LayoutContainerBoxSchema } from '@retikz/standard';
import { z } from 'zod';

import { ChartStyle, ChartStyleToken, ChartThemeMode } from './constants';

const PaintTokenSchema = z.string().min(1);
const NonNegativeTokenSchema = z.number().nonnegative();
const PaletteTokenSchema = z.array(z.string().min(1)).min(1).describe('Non-empty ordered color palette');
const BooleanTokenSchema = z.boolean();
const SchemeTokenSchema = z.string().min(1);
const FontWeightTokenSchema = FontSchema.shape.weight.unwrap();
const TextAlignTokenSchema = NodeSchema.shape.align.unwrap();
const LineHeightTokenSchema = NodeSchema.shape.lineHeight.unwrap();
const PaddingTokenSchema = LayoutContainerBoxSchema.shape.padding.unwrap();

/** Chart 样式 token 的唯一字段契约 */
export const ChartStyleTokenFieldShape = {
  [ChartStyleToken.ChartCanvasFill]: PaintTokenSchema.describe('Chart outer canvas fill paint'),
  [ChartStyleToken.ChartPadding]: PaddingTokenSchema.describe(
    'Chart surface inset around all presentation and Plot content',
  ),
  [ChartStyleToken.ChartGap]: NonNegativeTokenSchema.describe('Vertical gap between adjacent Chart presentation slots'),
  [ChartStyleToken.ChartFontFamily]: z.string().min(1).describe('Chart and Plot fallback font family'),
  [ChartStyleToken.ChartTitleForeground]: PaintTokenSchema.describe('Chart title text foreground paint'),
  [ChartStyleToken.ChartTitleFontSize]: FontSizeSchema.describe('Chart title font size'),
  [ChartStyleToken.ChartTitleFontWeight]: FontWeightTokenSchema.describe('Chart title font weight'),
  [ChartStyleToken.ChartTitleLineHeight]: LineHeightTokenSchema.describe('Chart title line height'),
  [ChartStyleToken.ChartTitleAlign]: TextAlignTokenSchema.describe('Chart title text alignment'),
  [ChartStyleToken.ChartSubtitleForeground]: PaintTokenSchema.describe('Chart subtitle text foreground paint'),
  [ChartStyleToken.ChartSubtitleFontSize]: FontSizeSchema.describe('Chart subtitle font size'),
  [ChartStyleToken.ChartSubtitleFontWeight]: FontWeightTokenSchema.describe('Chart subtitle font weight'),
  [ChartStyleToken.ChartSubtitleLineHeight]: LineHeightTokenSchema.describe('Chart subtitle line height'),
  [ChartStyleToken.ChartSubtitleAlign]: TextAlignTokenSchema.describe('Chart subtitle text alignment'),
  [ChartStyleToken.ChartCaptionForeground]: PaintTokenSchema.describe('Chart caption text foreground paint'),
  [ChartStyleToken.ChartCaptionFontSize]: FontSizeSchema.describe('Chart caption font size'),
  [ChartStyleToken.ChartCaptionFontWeight]: FontWeightTokenSchema.describe('Chart caption font weight'),
  [ChartStyleToken.ChartCaptionLineHeight]: LineHeightTokenSchema.describe('Chart caption line height'),
  [ChartStyleToken.ChartCaptionAlign]: TextAlignTokenSchema.describe('Chart caption text alignment'),
  [ChartStyleToken.ChartNoteForeground]: PaintTokenSchema.describe('Chart note text foreground paint'),
  [ChartStyleToken.ChartNoteFontSize]: FontSizeSchema.describe('Chart note font size'),
  [ChartStyleToken.ChartNoteFontWeight]: FontWeightTokenSchema.describe('Chart note font weight'),
  [ChartStyleToken.ChartNoteLineHeight]: LineHeightTokenSchema.describe('Chart note line height'),
  [ChartStyleToken.ChartNoteAlign]: TextAlignTokenSchema.describe('Chart note text alignment'),
  [ChartStyleToken.ChartSourceForeground]: PaintTokenSchema.describe('Chart source text foreground paint'),
  [ChartStyleToken.ChartSourceFontSize]: FontSizeSchema.describe('Chart source font size'),
  [ChartStyleToken.ChartSourceFontWeight]: FontWeightTokenSchema.describe('Chart source font weight'),
  [ChartStyleToken.ChartSourceLineHeight]: LineHeightTokenSchema.describe('Chart source line height'),
  [ChartStyleToken.ChartSourceAlign]: TextAlignTokenSchema.describe('Chart source text alignment'),
  [ChartStyleToken.ChartCreditForeground]: PaintTokenSchema.describe('Chart credit text foreground paint'),
  [ChartStyleToken.ChartCreditFontSize]: FontSizeSchema.describe('Chart credit font size'),
  [ChartStyleToken.ChartCreditFontWeight]: FontWeightTokenSchema.describe('Chart credit font weight'),
  [ChartStyleToken.ChartCreditLineHeight]: LineHeightTokenSchema.describe('Chart credit line height'),
  [ChartStyleToken.ChartCreditAlign]: TextAlignTokenSchema.describe('Chart credit text alignment'),
  [ChartStyleToken.PlotSurfaceFill]: PaintTokenSchema.describe('Plot panel background fill paint'),
  [ChartStyleToken.PlotForeground]: PaintTokenSchema.describe('Plot guide typography fallback foreground paint'),
  [ChartStyleToken.PlotLabelForeground]: PaintTokenSchema.describe('Plot static label foreground paint'),
  [ChartStyleToken.PlotLabelFontSize]: FontSizeSchema.describe('Plot static label font size'),
  [ChartStyleToken.AxisEnabled]: BooleanTokenSchema.describe('Whether Chart recipes create default axis guides'),
  [ChartStyleToken.AxisLineEnabled]: BooleanTokenSchema.describe('Whether Plot axes show a baseline by default'),
  [ChartStyleToken.AxisLineStroke]: PaintTokenSchema.describe('Plot axis baseline stroke paint'),
  [ChartStyleToken.AxisLineStrokeWidth]: AxisLineStyleSchema.shape.strokeWidth
    .unwrap()
    .describe('Plot axis baseline stroke width'),
  [ChartStyleToken.AxisLineDrawOpacity]: AxisLineStyleSchema.shape.drawOpacity
    .unwrap()
    .describe('Plot axis baseline draw opacity'),
  [ChartStyleToken.AxisTickMark]: AxisTickMarkSchema.describe('Plot axis tick mark glyph and style'),
  [ChartStyleToken.AxisTickLabelEnabled]: BooleanTokenSchema.describe(
    'Whether Plot axis tick labels are visible by default',
  ),
  [ChartStyleToken.AxisTickLabelForeground]: PaintTokenSchema.describe('Plot axis tick label foreground paint'),
  [ChartStyleToken.AxisTickLabelFontSize]: FontSizeSchema.describe('Plot axis tick label font size'),
  [ChartStyleToken.AxisTickLabelGap]: AxisTickLabelsSchema.shape.gap
    .unwrap()
    .describe('Gap from axis ticks to tick labels'),
  [ChartStyleToken.AxisTitleForeground]: PaintTokenSchema.describe('Plot axis title foreground paint'),
  [ChartStyleToken.AxisTitleFontSize]: FontSizeSchema.describe('Plot axis title font size'),
  [ChartStyleToken.AxisTitleFontWeight]: FontWeightTokenSchema.describe('Plot axis title font weight'),
  [ChartStyleToken.AxisGridEnabled]: BooleanTokenSchema.describe(
    'Whether Chart recipes enable default axis grid lines',
  ),
  [ChartStyleToken.AxisGridStroke]: PaintTokenSchema.describe('Plot axis grid line stroke paint'),
  [ChartStyleToken.AxisGridStrokeWidth]: AxisGridLineStyleSchema.shape.strokeWidth
    .unwrap()
    .describe('Plot axis grid line stroke width'),
  [ChartStyleToken.AxisGridDrawOpacity]: AxisGridLineStyleSchema.shape.drawOpacity
    .unwrap()
    .describe('Plot axis grid line draw opacity'),
  [ChartStyleToken.LegendEnabled]: BooleanTokenSchema.describe('Whether Chart recipes may create a default legend'),
  [ChartStyleToken.LegendTitleForeground]: PaintTokenSchema.describe('Plot legend title foreground paint'),
  [ChartStyleToken.LegendTitleFontSize]: FontSizeSchema.describe('Plot legend title font size'),
  [ChartStyleToken.LegendTitleFontWeight]: FontWeightTokenSchema.describe('Plot legend title font weight'),
  [ChartStyleToken.LegendLabelForeground]: PaintTokenSchema.describe('Plot legend entry label foreground paint'),
  [ChartStyleToken.LegendLabelFontSize]: FontSizeSchema.describe('Plot legend entry label font size'),
  [ChartStyleToken.LegendSwatchSize]: LegendGuideStyleSchema.shape.swatchSize
    .unwrap()
    .describe('Plot legend swatch size'),
  [ChartStyleToken.LegendSwatchGap]: LegendGuideStyleSchema.shape.swatchGap
    .unwrap()
    .describe('Gap from a Plot legend swatch to its label'),
  [ChartStyleToken.LegendEntryGap]: LegendGuideStyleSchema.shape.entryGap
    .unwrap()
    .describe('Gap between adjacent Plot legend entries'),
  [ChartStyleToken.LegendTitleGap]: LegendGuideStyleSchema.shape.titleGap
    .unwrap()
    .describe('Gap from a Plot legend title to its entries'),
  [ChartStyleToken.LegendRampLength]: LegendGuideStyleSchema.shape.rampLength
    .unwrap()
    .describe('Plot continuous legend ramp length'),
  [ChartStyleToken.LegendRampThickness]: LegendGuideStyleSchema.shape.rampThickness
    .unwrap()
    .describe('Plot continuous legend ramp thickness'),
  [ChartStyleToken.LegendSymbolSize]: LegendGuideStyleSchema.shape.symbolSize
    .unwrap()
    .describe('Plot legend symbol visual box size'),
  [ChartStyleToken.LegendSymbolScale]: LegendGuideStyleSchema.shape.symbolScale
    .unwrap()
    .describe('Plot legend symbol scale factor'),
  [ChartStyleToken.LegendSymbolFit]: LegendGuideStyleSchema.shape.symbolFit
    .unwrap()
    .describe('Plot legend symbol fit strategy'),
  [ChartStyleToken.DataPaletteCategorical]: PaletteTokenSchema.describe('Categorical scale default color palette'),
  [ChartStyleToken.DataPaletteSeries]: PaletteTokenSchema.describe('Mark and series default color palette'),
  [ChartStyleToken.DataPaletteSector]: PaletteTokenSchema.describe('Sector mark default color palette'),
  [ChartStyleToken.DataPaletteSequential]: SchemeTokenSchema.describe('Sequential scale default Plot scheme name'),
  [ChartStyleToken.DataPaletteDiverging]: SchemeTokenSchema.describe('Diverging scale default Plot scheme name'),
} as const;

/** 用户可稀疏覆盖的严格 Chart 样式 token map */
export const ChartStyleTokenOverridesSchema = z
  .strictObject(ChartStyleTokenFieldShape)
  .partial()
  .superRefine((overrides, ctx) => {
    for (const token of Object.values(ChartStyleToken)) {
      if (Object.hasOwn(overrides, token) && overrides[token] === undefined) {
        ctx.addIssue({
          code: 'custom',
          path: [token],
          message: 'Chart style token overrides must omit unset values instead of using undefined',
        });
      }
    }
  })
  .describe('Sparse strict overrides for canonical Chart style tokens');

/** preset 解析后的完整严格 Chart 样式 token map */
export const ChartResolvedStyleTokensSchema = z
  .strictObject(ChartStyleTokenFieldShape)
  .describe('Complete resolved map of canonical Chart style tokens');

/** 所有 Chart variant 共享的主题输入字段 */
export const ChartStyleSurfaceSchema = z
  .strictObject({
    style: z.enum(ChartStyle).optional().describe('Built-in Chart visual-language preset'),
    themeMode: z.enum(ChartThemeMode).optional().describe('Light or dark paint environment'),
    styleTokens: ChartStyleTokenOverridesSchema.optional().describe('Sparse canonical Chart token overrides'),
    colors: PlotSpecSchema.shape.colors.unwrap().optional().describe('Plot palette shorthand override'),
  })
  .describe('Shared JSON-safe Chart style input');
