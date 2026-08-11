import type { IRChartResolvedThemeTokens } from '@retikz/chart';
import type { ResolvedTheme } from '@retikz/core';

import { ChartResolvedThemeTokensSchema, ChartThemeToken, defineChartThemeStyle } from '@retikz/chart';
import { NodeTextAlign } from '@retikz/core';

import { PreviewThemeStyle } from '../constants';

type ReferenceStyle = Exclude<(typeof PreviewThemeStyle)[keyof typeof PreviewThemeStyle], 'default'>;

const styles = {
  academic: {
    padding: 16,
    gap: 6,
    fontFamily: 'Inter, Helvetica Neue, Arial, sans-serif',
    typography: [
      [18, 600, 22],
      [13, 400, 18],
      [12, 400, 17],
      [11, 400, 15],
      [11, 400, 15],
      [11, 400, 15],
    ],
    light: { canvas: '#FFFFFF', slots: ['#111827', '#374151', '#4B5563', '#6B7280', '#6B7280', '#6B7280'] },
    dark: { canvas: '#0F172A', slots: ['#F9FAFB', '#D1D5DB', '#CBD5E1', '#94A3B8', '#94A3B8', '#94A3B8'] },
  },
  vibrant: {
    padding: 16,
    gap: 8,
    fontFamily: 'Inter, Segoe UI, Arial, sans-serif',
    typography: [
      [20, 700, 24],
      [14, 500, 19],
      [12, 400, 17],
      [11, 400, 15],
      [11, 500, 15],
      [11, 500, 15],
    ],
    light: { canvas: '#F8FAFC', slots: ['#172B4D', '#425466', '#52616B', '#66788A', '#66788A', '#66788A'] },
    dark: { canvas: '#111827', slots: ['#FFFFFF', '#E2E8F0', '#CBD5E1', '#94A3B8', '#94A3B8', '#94A3B8'] },
  },
  clean: {
    padding: 20,
    gap: 8,
    fontFamily: 'Inter, Helvetica Neue, Arial, sans-serif',
    typography: [
      [20, 700, 25],
      [13, 400, 18],
      [11, 400, 16],
      [11, 400, 16],
      [10, 500, 14],
      [10, 500, 14],
    ],
    light: { canvas: 'none', slots: ['#24231F', '#514F49', '#66635C', '#77736A', '#8A877F', '#8A877F'] },
    dark: { canvas: 'none', slots: ['#F2F0EA', '#D0CDC4', '#C0BDB4', '#A7A39A', '#8E8A82', '#8E8A82'] },
  },
} as const;

const groups = [
  [
    ChartThemeToken.ChartTitleForeground,
    ChartThemeToken.ChartTitleFontSize,
    ChartThemeToken.ChartTitleFontWeight,
    ChartThemeToken.ChartTitleLineHeight,
    ChartThemeToken.ChartTitleAlign,
  ],
  [
    ChartThemeToken.ChartSubtitleForeground,
    ChartThemeToken.ChartSubtitleFontSize,
    ChartThemeToken.ChartSubtitleFontWeight,
    ChartThemeToken.ChartSubtitleLineHeight,
    ChartThemeToken.ChartSubtitleAlign,
  ],
  [
    ChartThemeToken.ChartCaptionForeground,
    ChartThemeToken.ChartCaptionFontSize,
    ChartThemeToken.ChartCaptionFontWeight,
    ChartThemeToken.ChartCaptionLineHeight,
    ChartThemeToken.ChartCaptionAlign,
  ],
  [
    ChartThemeToken.ChartNoteForeground,
    ChartThemeToken.ChartNoteFontSize,
    ChartThemeToken.ChartNoteFontWeight,
    ChartThemeToken.ChartNoteLineHeight,
    ChartThemeToken.ChartNoteAlign,
  ],
  [
    ChartThemeToken.ChartSourceForeground,
    ChartThemeToken.ChartSourceFontSize,
    ChartThemeToken.ChartSourceFontWeight,
    ChartThemeToken.ChartSourceLineHeight,
    ChartThemeToken.ChartSourceAlign,
  ],
  [
    ChartThemeToken.ChartCreditForeground,
    ChartThemeToken.ChartCreditFontSize,
    ChartThemeToken.ChartCreditFontWeight,
    ChartThemeToken.ChartCreditLineHeight,
    ChartThemeToken.ChartCreditAlign,
  ],
] as const;

const tokensOf = (style: ReferenceStyle, theme: ResolvedTheme): IRChartResolvedThemeTokens => {
  const preset = styles[style];
  const paint = preset[theme.mode];
  return ChartResolvedThemeTokensSchema.parse({
    [ChartThemeToken.ChartCanvasFill]: paint.canvas,
    [ChartThemeToken.ChartPadding]: preset.padding,
    [ChartThemeToken.ChartGap]: preset.gap,
    [ChartThemeToken.ChartFontFamily]: preset.fontFamily,
    ...Object.fromEntries(
      groups.flatMap(([foreground, fontSize, fontWeight, lineHeight, align], index) => {
        const [size, weight, height] = preset.typography[index];
        return [
          [foreground, paint.slots[index]],
          [fontSize, size],
          [fontWeight, weight],
          [lineHeight, height],
          [align, NodeTextAlign.Start],
        ];
      }),
    ),
    [ChartThemeToken.ChartAxisEnabled]: true,
    [ChartThemeToken.ChartAxisGridEnabled]: true,
    [ChartThemeToken.ChartLegendEnabled]: true,
  });
};

/** docs 维护的三个 Chart reference Theme definitions */
export const PreviewChartThemeStyles = [
  PreviewThemeStyle.Academic,
  PreviewThemeStyle.Vibrant,
  PreviewThemeStyle.Clean,
].map(style => defineChartThemeStyle({ name: style, resolve: theme => tokensOf(style, theme) }));
