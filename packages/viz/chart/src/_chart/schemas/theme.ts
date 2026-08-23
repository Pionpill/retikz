import {
  CssColorSchema,
  FontFamilySchema,
  FontSizeSchema,
  FontWeightSchema,
  LineHeightSchema,
  NodeTextAlign,
  PaintValueSchema,
} from '@retikz/core';
import { LayoutContainerBoxSchema, LayoutGapSchema } from '@retikz/layout';
import { PlotThemeTokenOverridesSchema } from '@retikz/plot';
import { z } from 'zod';

import { ChartThemeToken } from '../constants';

const PaddingTokenSchema = LayoutContainerBoxSchema.shape.padding.unwrap();

/** Chart shell 的 token 字段 */
export const ChartThemeTokenFieldShape = {
  [ChartThemeToken.CanvasFill]: PaintValueSchema.describe('Chart canvas fill'),
  [ChartThemeToken.Padding]: PaddingTokenSchema.describe('Chart outer padding'),
  [ChartThemeToken.Gap]: LayoutGapSchema.describe('Chart presentation slot gap'),
  [ChartThemeToken.FontFamily]: FontFamilySchema.describe('Chart presentation font family'),
  [ChartThemeToken.TitleForeground]: CssColorSchema.describe('Chart title foreground'),
  [ChartThemeToken.TitleFontSize]: FontSizeSchema.describe('Chart title font size'),
  [ChartThemeToken.TitleFontWeight]: FontWeightSchema.describe('Chart title font weight'),
  [ChartThemeToken.TitleLineHeight]: LineHeightSchema.describe('Chart title line height'),
  [ChartThemeToken.TitleAlign]: z.enum(NodeTextAlign).describe('Chart title alignment'),
  [ChartThemeToken.SubtitleForeground]: CssColorSchema.describe('Chart subtitle foreground'),
  [ChartThemeToken.SubtitleFontSize]: FontSizeSchema.describe('Chart subtitle font size'),
  [ChartThemeToken.SubtitleFontWeight]: FontWeightSchema.describe('Chart subtitle font weight'),
  [ChartThemeToken.SubtitleLineHeight]: LineHeightSchema.describe('Chart subtitle line height'),
  [ChartThemeToken.SubtitleAlign]: z.enum(NodeTextAlign).describe('Chart subtitle alignment'),
  [ChartThemeToken.NoteForeground]: CssColorSchema.describe('Chart note foreground'),
  [ChartThemeToken.NoteFontSize]: FontSizeSchema.describe('Chart note font size'),
  [ChartThemeToken.NoteFontWeight]: FontWeightSchema.describe('Chart note font weight'),
  [ChartThemeToken.NoteLineHeight]: LineHeightSchema.describe('Chart note line height'),
  [ChartThemeToken.NoteAlign]: z.enum(NodeTextAlign).describe('Chart note alignment'),
  [ChartThemeToken.SourceForeground]: CssColorSchema.describe('Chart source foreground'),
  [ChartThemeToken.SourceFontSize]: FontSizeSchema.describe('Chart source font size'),
  [ChartThemeToken.SourceFontWeight]: FontWeightSchema.describe('Chart source font weight'),
  [ChartThemeToken.SourceLineHeight]: LineHeightSchema.describe('Chart source line height'),
  [ChartThemeToken.SourceAlign]: z.enum(NodeTextAlign).describe('Chart source alignment'),
} as const;

/** Chart shell 的稀疏 token 覆盖 */
export const ChartThemeOverridesSchema = z
  .strictObject(ChartThemeTokenFieldShape)
  .partial()
  .superRefine((overrides, context) => {
    for (const token of Object.values(ChartThemeToken)) {
      if (Object.hasOwn(overrides, token) && overrides[token] === undefined) {
        context.addIssue({
          code: 'custom',
          path: [token],
          message: 'Chart theme token overrides must omit unset values instead of using undefined',
        });
      }
    }
  })
  .describe('Sparse Chart shell token overrides');

/** Chart shell 的完整 token resolution */
export const ChartThemeResolutionSchema = z
  .strictObject(ChartThemeTokenFieldShape)
  .describe('Complete Chart shell token map after explicit fallback and cascade');

/** 判断 authored Theme 是否包含至少一个实际 token */
const hasTokenSlice = (value: unknown): boolean =>
  typeof value === 'object' && value !== null && Object.keys(value).length > 0;

/** 用精确 recipe schema 创建 Chart authored theme schema */
export const createChartThemeSchema = <TRecipe extends z.ZodTypeAny>(recipe: TRecipe) =>
  z
    .union([
      z.string().min(1).describe('Registered Chart theme name'),
      z
        .strictObject({
          base: z.string().min(1).optional().describe('Registered base Chart theme name'),
          tokens: z
            .strictObject({
              chart: ChartThemeOverridesSchema.optional(),
              plot: PlotThemeTokenOverridesSchema.optional(),
              recipe: recipe.optional(),
            })
            .optional(),
        })
        .superRefine((theme, context) => {
          const tokens = theme.tokens;
          const hasAuthoredTokens =
            tokens !== undefined &&
            (hasTokenSlice(tokens.chart) || hasTokenSlice(tokens.plot) || hasTokenSlice(tokens.recipe));
          if (theme.base === undefined && !hasAuthoredTokens) {
            context.addIssue({ code: 'custom', path: [], message: 'Chart theme object requires base or tokens' });
          }
        }),
    ])
    .describe('Named or authored Chart theme input with separated owner slices');

/** Chart shell token IR 类型 */
export type IRChartThemeOverrides = z.infer<typeof ChartThemeOverridesSchema>;
export type IRChartThemeResolution = z.infer<typeof ChartThemeResolutionSchema>;
