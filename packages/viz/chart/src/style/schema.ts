import {
  CssColorSchema,
  FontFamilySchema,
  FontSizeSchema,
  FontWeightSchema,
  LineHeightSchema,
  PaintValueSchema,
  TextAlignSchema,
} from '@retikz/core';
import { PlotSpecSchema, PlotThemeTokenOverridesSchema } from '@retikz/plot';
import { LayoutContainerBoxSchema, LayoutGapSchema } from '@retikz/standard';
import { z } from 'zod';

import { ChartStyleToken } from './constants';

const PaddingTokenSchema = LayoutContainerBoxSchema.shape.padding.unwrap();

/** Chart 样式 token 的唯一字段契约 */
export const ChartStyleTokenFieldShape = {
  [ChartStyleToken.ChartCanvasFill]: PaintValueSchema.describe('Chart outer canvas fill paint'),
  [ChartStyleToken.ChartPadding]: PaddingTokenSchema.describe('Chart presentation and Plot content inset'),
  [ChartStyleToken.ChartGap]: LayoutGapSchema.describe('Gap between adjacent Chart presentation slots'),
  [ChartStyleToken.ChartFontFamily]: FontFamilySchema.describe('Chart presentation fallback font family'),
  [ChartStyleToken.ChartTitleForeground]: CssColorSchema.describe('Chart title foreground color'),
  [ChartStyleToken.ChartTitleFontSize]: FontSizeSchema.describe('Chart title font size'),
  [ChartStyleToken.ChartTitleFontWeight]: FontWeightSchema.describe('Chart title font weight'),
  [ChartStyleToken.ChartTitleLineHeight]: LineHeightSchema.describe('Chart title line height'),
  [ChartStyleToken.ChartTitleAlign]: TextAlignSchema.describe('Chart title text alignment'),
  [ChartStyleToken.ChartSubtitleForeground]: CssColorSchema.describe('Chart subtitle foreground color'),
  [ChartStyleToken.ChartSubtitleFontSize]: FontSizeSchema.describe('Chart subtitle font size'),
  [ChartStyleToken.ChartSubtitleFontWeight]: FontWeightSchema.describe('Chart subtitle font weight'),
  [ChartStyleToken.ChartSubtitleLineHeight]: LineHeightSchema.describe('Chart subtitle line height'),
  [ChartStyleToken.ChartSubtitleAlign]: TextAlignSchema.describe('Chart subtitle text alignment'),
  [ChartStyleToken.ChartCaptionForeground]: CssColorSchema.describe('Chart caption foreground color'),
  [ChartStyleToken.ChartCaptionFontSize]: FontSizeSchema.describe('Chart caption font size'),
  [ChartStyleToken.ChartCaptionFontWeight]: FontWeightSchema.describe('Chart caption font weight'),
  [ChartStyleToken.ChartCaptionLineHeight]: LineHeightSchema.describe('Chart caption line height'),
  [ChartStyleToken.ChartCaptionAlign]: TextAlignSchema.describe('Chart caption text alignment'),
  [ChartStyleToken.ChartNoteForeground]: CssColorSchema.describe('Chart note foreground color'),
  [ChartStyleToken.ChartNoteFontSize]: FontSizeSchema.describe('Chart note font size'),
  [ChartStyleToken.ChartNoteFontWeight]: FontWeightSchema.describe('Chart note font weight'),
  [ChartStyleToken.ChartNoteLineHeight]: LineHeightSchema.describe('Chart note line height'),
  [ChartStyleToken.ChartNoteAlign]: TextAlignSchema.describe('Chart note text alignment'),
  [ChartStyleToken.ChartSourceForeground]: CssColorSchema.describe('Chart source foreground color'),
  [ChartStyleToken.ChartSourceFontSize]: FontSizeSchema.describe('Chart source font size'),
  [ChartStyleToken.ChartSourceFontWeight]: FontWeightSchema.describe('Chart source font weight'),
  [ChartStyleToken.ChartSourceLineHeight]: LineHeightSchema.describe('Chart source line height'),
  [ChartStyleToken.ChartSourceAlign]: TextAlignSchema.describe('Chart source text alignment'),
  [ChartStyleToken.ChartCreditForeground]: CssColorSchema.describe('Chart credit foreground color'),
  [ChartStyleToken.ChartCreditFontSize]: FontSizeSchema.describe('Chart credit font size'),
  [ChartStyleToken.ChartCreditFontWeight]: FontWeightSchema.describe('Chart credit font weight'),
  [ChartStyleToken.ChartCreditLineHeight]: LineHeightSchema.describe('Chart credit line height'),
  [ChartStyleToken.ChartCreditAlign]: TextAlignSchema.describe('Chart credit text alignment'),
  [ChartStyleToken.ChartAxisEnabled]: z.boolean().describe('Whether Chart recipes create default axis guides'),
  [ChartStyleToken.ChartAxisGridEnabled]: z.boolean().describe('Whether Chart recipes enable default axis grids'),
  [ChartStyleToken.ChartLegendEnabled]: z.boolean().describe('Whether Chart recipes may create a default legend'),
} as const;

/** 用户可稀疏覆盖的严格 Chart token map */
export const ChartStyleTokenOverridesSchema = z
  .strictObject(ChartStyleTokenFieldShape)
  .partial()
  .superRefine((overrides, context) => {
    for (const token of Object.values(ChartStyleToken)) {
      if (Object.hasOwn(overrides, token) && overrides[token] === undefined) {
        context.addIssue({
          code: 'custom',
          path: [token],
          message: 'Chart style token overrides must omit unset values instead of using undefined',
        });
      }
    }
  })
  .describe('Sparse strict overrides for canonical Chart style tokens');

/** preset 与用户覆盖解析后的完整 Chart token map */
export const ChartResolvedStyleTokensSchema = z
  .strictObject(ChartStyleTokenFieldShape)
  .describe('Complete resolved map of canonical Chart style tokens');

/** 所有 Chart variant 共享的主题输入字段 */
export const ChartStyleSurfaceSchema = z
  .strictObject({
    chartThemeTokens: ChartStyleTokenOverridesSchema.optional().describe('Sparse canonical Chart token overrides'),
    plotThemeTokens: PlotThemeTokenOverridesSchema.optional().describe(
      'Plot-owned token overrides forwarded unchanged',
    ),
    colors: PlotSpecSchema.shape.colors.unwrap().optional().describe('Plot palette shorthand forwarded unchanged'),
  })
  .describe('Shared JSON-safe Chart and forwarded Plot style inputs');
