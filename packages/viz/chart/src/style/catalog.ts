import type { BuiltinThemeStyleValue, ThemeModeValue } from '@retikz/core';

import { NodeTextAlign, ThemeMode, ThemeStyle } from '@retikz/core';

import type { ChartThemeTokenValue, IRChartResolvedThemeTokens } from './types';

import { ChartThemeToken } from './constants';
import { defineChartThemeStyle } from './definition';
import { ChartResolvedThemeTokensSchema } from './schema';

type PresetStructure = Readonly<{
  padding: number;
  gap: number;
  fontFamily: string;
  gridEnabled: boolean;
}>;

type PresetPaint = Readonly<{
  canvas: string;
  slots: ReadonlyArray<string>;
}>;

type PresentationTokenGroup = Readonly<{
  foreground: ChartThemeTokenValue;
  fontSize: ChartThemeTokenValue;
  fontWeight: ChartThemeTokenValue;
  lineHeight: ChartThemeTokenValue;
  align: ChartThemeTokenValue;
}>;

const structures: Record<BuiltinThemeStyleValue, PresetStructure> = {
  [ThemeStyle.Neutral]: {
    padding: 16,
    gap: 6,
    fontFamily: 'system-ui, Segoe UI, sans-serif',
    gridEnabled: true,
  },
  [ThemeStyle.Academic]: {
    padding: 16,
    gap: 6,
    fontFamily: 'Inter, Helvetica Neue, Arial, sans-serif',
    gridEnabled: true,
  },
  [ThemeStyle.Vibrant]: {
    padding: 16,
    gap: 8,
    fontFamily: 'Inter, Segoe UI, Arial, sans-serif',
    gridEnabled: true,
  },
  [ThemeStyle.Clean]: {
    padding: 12,
    gap: 4,
    fontFamily: 'system-ui, Segoe UI, sans-serif',
    gridEnabled: false,
  },
};

const typography: Record<BuiltinThemeStyleValue, ReadonlyArray<readonly [number, number, number]>> = {
  [ThemeStyle.Neutral]: [
    [18, 600, 22],
    [13, 400, 18],
    [12, 400, 17],
    [11, 400, 15],
    [11, 500, 15],
    [11, 500, 15],
  ],
  [ThemeStyle.Academic]: [
    [18, 600, 22],
    [13, 400, 18],
    [12, 400, 17],
    [11, 400, 15],
    [11, 400, 15],
    [11, 400, 15],
  ],
  [ThemeStyle.Vibrant]: [
    [20, 700, 24],
    [14, 500, 19],
    [12, 400, 17],
    [11, 400, 15],
    [11, 500, 15],
    [11, 500, 15],
  ],
  [ThemeStyle.Clean]: [
    [17, 600, 21],
    [12, 400, 17],
    [11, 400, 15],
    [10, 400, 14],
    [10, 400, 14],
    [10, 400, 14],
  ],
};

const paints: Record<BuiltinThemeStyleValue, Record<ThemeModeValue, PresetPaint>> = {
  [ThemeStyle.Neutral]: {
    [ThemeMode.Light]: {
      canvas: '#FFFFFF',
      slots: ['#09090B', '#3F3F46', '#52525B', '#71717A', '#71717A', '#71717A'],
    },
    [ThemeMode.Dark]: {
      canvas: '#09090B',
      slots: ['#FAFAFA', '#D4D4D8', '#A1A1AA', '#A1A1AA', '#A1A1AA', '#A1A1AA'],
    },
  },
  [ThemeStyle.Academic]: {
    [ThemeMode.Light]: {
      canvas: '#FFFFFF',
      slots: ['#111827', '#374151', '#4B5563', '#6B7280', '#6B7280', '#6B7280'],
    },
    [ThemeMode.Dark]: {
      canvas: '#0F172A',
      slots: ['#F9FAFB', '#D1D5DB', '#CBD5E1', '#94A3B8', '#94A3B8', '#94A3B8'],
    },
  },
  [ThemeStyle.Vibrant]: {
    [ThemeMode.Light]: {
      canvas: '#F8FAFC',
      slots: ['#172B4D', '#425466', '#52616B', '#66788A', '#66788A', '#66788A'],
    },
    [ThemeMode.Dark]: {
      canvas: '#111827',
      slots: ['#FFFFFF', '#E2E8F0', '#CBD5E1', '#94A3B8', '#94A3B8', '#94A3B8'],
    },
  },
  [ThemeStyle.Clean]: {
    [ThemeMode.Light]: {
      canvas: '#FFFFFF',
      slots: ['#111827', '#374151', '#4B5563', '#6B7280', '#6B7280', '#6B7280'],
    },
    [ThemeMode.Dark]: {
      canvas: '#0B0F14',
      slots: ['#F9FAFB', '#D1D5DB', '#D1D5DB', '#9CA3AF', '#9CA3AF', '#9CA3AF'],
    },
  },
};

const presentationTokenGroups: ReadonlyArray<PresentationTokenGroup> = [
  {
    foreground: ChartThemeToken.ChartTitleForeground,
    fontSize: ChartThemeToken.ChartTitleFontSize,
    fontWeight: ChartThemeToken.ChartTitleFontWeight,
    lineHeight: ChartThemeToken.ChartTitleLineHeight,
    align: ChartThemeToken.ChartTitleAlign,
  },
  {
    foreground: ChartThemeToken.ChartSubtitleForeground,
    fontSize: ChartThemeToken.ChartSubtitleFontSize,
    fontWeight: ChartThemeToken.ChartSubtitleFontWeight,
    lineHeight: ChartThemeToken.ChartSubtitleLineHeight,
    align: ChartThemeToken.ChartSubtitleAlign,
  },
  {
    foreground: ChartThemeToken.ChartCaptionForeground,
    fontSize: ChartThemeToken.ChartCaptionFontSize,
    fontWeight: ChartThemeToken.ChartCaptionFontWeight,
    lineHeight: ChartThemeToken.ChartCaptionLineHeight,
    align: ChartThemeToken.ChartCaptionAlign,
  },
  {
    foreground: ChartThemeToken.ChartNoteForeground,
    fontSize: ChartThemeToken.ChartNoteFontSize,
    fontWeight: ChartThemeToken.ChartNoteFontWeight,
    lineHeight: ChartThemeToken.ChartNoteLineHeight,
    align: ChartThemeToken.ChartNoteAlign,
  },
  {
    foreground: ChartThemeToken.ChartSourceForeground,
    fontSize: ChartThemeToken.ChartSourceFontSize,
    fontWeight: ChartThemeToken.ChartSourceFontWeight,
    lineHeight: ChartThemeToken.ChartSourceLineHeight,
    align: ChartThemeToken.ChartSourceAlign,
  },
  {
    foreground: ChartThemeToken.ChartCreditForeground,
    fontSize: ChartThemeToken.ChartCreditFontSize,
    fontWeight: ChartThemeToken.ChartCreditFontWeight,
    lineHeight: ChartThemeToken.ChartCreditLineHeight,
    align: ChartThemeToken.ChartCreditAlign,
  },
];

const presentationTokens = (
  style: BuiltinThemeStyleValue,
  paint: PresetPaint,
): Partial<Record<ChartThemeTokenValue, unknown>> =>
  Object.fromEntries(
    presentationTokenGroups.flatMap((tokens, index) => {
      const [size, weight, lineHeight] = typography[style][index];
      return [
        [tokens.foreground, paint.slots[index]],
        [tokens.fontSize, size],
        [tokens.fontWeight, weight],
        [tokens.lineHeight, lineHeight],
        [tokens.align, NodeTextAlign.Start],
      ];
    }),
  );

const createPreset = (style: BuiltinThemeStyleValue, mode: ThemeModeValue): IRChartResolvedThemeTokens => {
  const structure = structures[style];
  const paint = paints[style][mode];
  return ChartResolvedThemeTokensSchema.parse({
    [ChartThemeToken.ChartCanvasFill]: paint.canvas,
    [ChartThemeToken.ChartPadding]: structure.padding,
    [ChartThemeToken.ChartGap]: structure.gap,
    [ChartThemeToken.ChartFontFamily]: structure.fontFamily,
    ...presentationTokens(style, paint),
    [ChartThemeToken.ChartAxisEnabled]: true,
    [ChartThemeToken.ChartAxisGridEnabled]: structure.gridEnabled,
    [ChartThemeToken.ChartLegendEnabled]: true,
  });
};

const presets = Object.fromEntries(
  Object.values(ThemeStyle).map(style => [
    style,
    Object.fromEntries(Object.values(ThemeMode).map(mode => [mode, createPreset(style, mode)])),
  ]),
) as Record<BuiltinThemeStyleValue, Record<ThemeModeValue, IRChartResolvedThemeTokens>>;

/** 读取一个内建 Chart style/mode 的完整 token map */
export const getChartThemePreset = (style: BuiltinThemeStyleValue, mode: ThemeModeValue): IRChartResolvedThemeTokens =>
  structuredClone(presets[style][mode]);

/** 所有 Chart 内置 Theme style definitions */
export const BUILTIN_CHART_THEME_STYLES = (Object.values(ThemeStyle) as Array<BuiltinThemeStyleValue>).map(style =>
  defineChartThemeStyle({ name: style, resolve: theme => getChartThemePreset(style, theme.mode) }),
);
