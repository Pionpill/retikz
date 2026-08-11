import type { ThemeModeValue } from '@retikz/core';

import { NodeTextAlign, ThemeMode } from '@retikz/core';

import type { IRChartResolvedThemeTokens } from './types';

import { ChartThemeToken } from './constants';
import { ChartResolvedThemeTokensSchema } from './schema';

const paint = {
  [ThemeMode.Light]: {
    canvas: '#FFFFFF',
    slots: ['#09090B', '#3F3F46', '#71717A', '#71717A'],
  },
  [ThemeMode.Dark]: {
    canvas: '#09090B',
    slots: ['#FAFAFA', '#D4D4D8', '#A1A1AA', '#A1A1AA'],
  },
} as const;

const typography = [
  [18, 600, 22],
  [13, 400, 18],
  [11, 400, 15],
  [11, 500, 15],
] as const;

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
] as const;

const createPreset = (mode: ThemeModeValue): IRChartResolvedThemeTokens =>
  ChartResolvedThemeTokensSchema.parse({
    [ChartThemeToken.ChartCanvasFill]: paint[mode].canvas,
    [ChartThemeToken.ChartPadding]: 16,
    [ChartThemeToken.ChartGap]: 6,
    [ChartThemeToken.ChartFontFamily]: 'system-ui, Segoe UI, sans-serif',
    ...Object.fromEntries(
      groups.flatMap(([foreground, fontSize, fontWeight, lineHeight, align], index) => {
        const [size, weight, height] = typography[index];
        return [
          [foreground, paint[mode].slots[index]],
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

/** 读取默认 Chart baseline 在指定 mode 下的完整 token map */
export const getDefaultChartThemePreset = (mode: ThemeModeValue): IRChartResolvedThemeTokens => {
  return structuredClone(createPreset(mode));
};
