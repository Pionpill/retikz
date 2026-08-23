import type { IRChartThemeOverrides } from '@retikz/chart';

import { ChartThemeOverridesSchema, ChartThemeToken, defineChartTheme } from '@retikz/chart';
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
      [11, 400, 15],
      [11, 400, 15],
    ],
  },
  vibrant: {
    padding: 16,
    gap: 8,
    fontFamily: 'Inter, Segoe UI, Arial, sans-serif',
    typography: [
      [20, 700, 24],
      [14, 500, 19],
      [11, 400, 15],
      [11, 500, 15],
    ],
  },
  clean: {
    padding: 20,
    gap: 8,
    fontFamily: 'Inter, Helvetica Neue, Arial, sans-serif',
    typography: [
      [20, 700, 25],
      [13, 400, 18],
      [11, 400, 16],
      [10, 500, 14],
    ],
  },
} as const;

const groups = [
  [
    ChartThemeToken.TitleFontSize,
    ChartThemeToken.TitleFontWeight,
    ChartThemeToken.TitleLineHeight,
    ChartThemeToken.TitleAlign,
  ],
  [
    ChartThemeToken.SubtitleFontSize,
    ChartThemeToken.SubtitleFontWeight,
    ChartThemeToken.SubtitleLineHeight,
    ChartThemeToken.SubtitleAlign,
  ],
  [
    ChartThemeToken.NoteFontSize,
    ChartThemeToken.NoteFontWeight,
    ChartThemeToken.NoteLineHeight,
    ChartThemeToken.NoteAlign,
  ],
  [
    ChartThemeToken.SourceFontSize,
    ChartThemeToken.SourceFontWeight,
    ChartThemeToken.SourceLineHeight,
    ChartThemeToken.SourceAlign,
  ],
] as const;

const tokensOf = (style: ReferenceStyle): IRChartThemeOverrides => {
  const preset = styles[style];
  return ChartThemeOverridesSchema.parse({
    [ChartThemeToken.Padding]: preset.padding,
    [ChartThemeToken.Gap]: preset.gap,
    [ChartThemeToken.FontFamily]: preset.fontFamily,
    ...Object.fromEntries(
      groups.flatMap(([fontSize, fontWeight, lineHeight, align], index) => {
        const [size, weight, height] = preset.typography[index];
        return [
          [fontSize, size],
          [fontWeight, weight],
          [lineHeight, height],
          [align, NodeTextAlign.Start],
        ];
      }),
    ),
  });
};

/** docs 维护的三个 Chart reference Theme definitions */
export const PreviewChartThemeDefinitions = [
  PreviewThemeStyle.Academic,
  PreviewThemeStyle.Vibrant,
  PreviewThemeStyle.Clean,
].map(name => defineChartTheme({ name, tokens: { chart: tokensOf(name) } }));
