import {
  CssColorSchema,
  FontFamilySchema,
  FontSizeSchema,
  FontWeightSchema,
  LineHeightSchema,
  PaintValueSchema,
  TextAlignSchema,
} from '@retikz/core';
import { LayoutContainerBoxSchema, LayoutGapSchema } from '@retikz/layout';
import { PlotAxisThemeTokenRulesSchema, PlotThemeSchema, PlotThemeTokenOverridesSchema } from '@retikz/plot';
import { z } from 'zod';

import { ChartThemeToken } from './constants';

const PaddingTokenSchema = LayoutContainerBoxSchema.shape.padding.unwrap();

/** Chart 样式 token 的唯一字段契约 */
export const ChartThemeTokenFieldShape = {
  [ChartThemeToken.ChartCanvasFill]: PaintValueSchema.describe('Chart outer canvas fill paint'),
  [ChartThemeToken.ChartPadding]: PaddingTokenSchema.describe('Chart presentation and Plot content inset'),
  [ChartThemeToken.ChartGap]: LayoutGapSchema.describe('Gap between adjacent Chart presentation slots'),
  [ChartThemeToken.ChartFontFamily]: FontFamilySchema.describe('Chart presentation fallback font family'),
  [ChartThemeToken.ChartTitleForeground]: CssColorSchema.describe('Chart title foreground color'),
  [ChartThemeToken.ChartTitleFontSize]: FontSizeSchema.describe('Chart title font size'),
  [ChartThemeToken.ChartTitleFontWeight]: FontWeightSchema.describe('Chart title font weight'),
  [ChartThemeToken.ChartTitleLineHeight]: LineHeightSchema.describe('Chart title line height'),
  [ChartThemeToken.ChartTitleAlign]: TextAlignSchema.describe('Chart title text alignment'),
  [ChartThemeToken.ChartSubtitleForeground]: CssColorSchema.describe('Chart subtitle foreground color'),
  [ChartThemeToken.ChartSubtitleFontSize]: FontSizeSchema.describe('Chart subtitle font size'),
  [ChartThemeToken.ChartSubtitleFontWeight]: FontWeightSchema.describe('Chart subtitle font weight'),
  [ChartThemeToken.ChartSubtitleLineHeight]: LineHeightSchema.describe('Chart subtitle line height'),
  [ChartThemeToken.ChartSubtitleAlign]: TextAlignSchema.describe('Chart subtitle text alignment'),
  [ChartThemeToken.ChartNoteForeground]: CssColorSchema.describe('Chart note foreground color'),
  [ChartThemeToken.ChartNoteFontSize]: FontSizeSchema.describe('Chart note font size'),
  [ChartThemeToken.ChartNoteFontWeight]: FontWeightSchema.describe('Chart note font weight'),
  [ChartThemeToken.ChartNoteLineHeight]: LineHeightSchema.describe('Chart note line height'),
  [ChartThemeToken.ChartNoteAlign]: TextAlignSchema.describe('Chart note text alignment'),
  [ChartThemeToken.ChartSourceForeground]: CssColorSchema.describe('Chart source foreground color'),
  [ChartThemeToken.ChartSourceFontSize]: FontSizeSchema.describe('Chart source font size'),
  [ChartThemeToken.ChartSourceFontWeight]: FontWeightSchema.describe('Chart source font weight'),
  [ChartThemeToken.ChartSourceLineHeight]: LineHeightSchema.describe('Chart source line height'),
  [ChartThemeToken.ChartSourceAlign]: TextAlignSchema.describe('Chart source text alignment'),
  [ChartThemeToken.ChartAxisEnabled]: z.boolean().describe('Whether Chart recipes create default axis guides'),
  [ChartThemeToken.ChartAxisGridEnabled]: z.boolean().describe('Whether Chart recipes enable default axis grids'),
  [ChartThemeToken.ChartLegendEnabled]: z.boolean().describe('Whether Chart recipes may create a default legend'),
} as const;

/** 用户可稀疏覆盖的严格 Chart token map */
export const ChartThemeTokenOverridesSchema = z
  .strictObject(ChartThemeTokenFieldShape)
  .partial()
  .superRefine((overrides, context) => {
    for (const token of Object.values(ChartThemeToken)) {
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
export const ChartResolvedThemeTokensSchema = z
  .strictObject(ChartThemeTokenFieldShape)
  .describe('Complete resolved map of canonical Chart style tokens');

/** 所有 Chart variant 共享的主题输入字段 */
export const ChartThemeSurfaceSchema = z
  .strictObject({
    chartThemeTokens: ChartThemeTokenOverridesSchema.optional().describe('Sparse canonical Chart token overrides'),
    plotThemeTokens: PlotThemeTokenOverridesSchema.optional().describe(
      'Plot-owned token overrides forwarded unchanged',
    ),
    plotThemeTokenRules: PlotAxisThemeTokenRulesSchema.optional().describe(
      'Plot-owned Axis token rules forwarded unchanged',
    ),
    plotTheme: PlotThemeSchema.optional().describe('Plot native theme forwarded unchanged'),
  })
  .describe('Shared JSON-safe Chart and forwarded Plot style inputs');
