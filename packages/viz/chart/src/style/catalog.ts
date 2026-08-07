import type { ThemeModeValue, ThemeStyleValue } from '@retikz/core';

import { NodeTextAlign, ThemeMode, ThemeStyle } from '@retikz/core';

import type { ChartStyleTokenValue, IRChartResolvedStyleTokens } from './types';

import { ChartStyleToken } from './constants';
import { ChartResolvedStyleTokensSchema } from './schema';

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
  foreground: ChartStyleTokenValue;
  fontSize: ChartStyleTokenValue;
  fontWeight: ChartStyleTokenValue;
  lineHeight: ChartStyleTokenValue;
  align: ChartStyleTokenValue;
}>;

const structures: Record<ThemeStyleValue, PresetStructure> = {
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

const typography: Record<ThemeStyleValue, ReadonlyArray<readonly [number, number, number]>> = {
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

const paints: Record<ThemeStyleValue, Record<ThemeModeValue, PresetPaint>> = {
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
    foreground: ChartStyleToken.ChartTitleForeground,
    fontSize: ChartStyleToken.ChartTitleFontSize,
    fontWeight: ChartStyleToken.ChartTitleFontWeight,
    lineHeight: ChartStyleToken.ChartTitleLineHeight,
    align: ChartStyleToken.ChartTitleAlign,
  },
  {
    foreground: ChartStyleToken.ChartSubtitleForeground,
    fontSize: ChartStyleToken.ChartSubtitleFontSize,
    fontWeight: ChartStyleToken.ChartSubtitleFontWeight,
    lineHeight: ChartStyleToken.ChartSubtitleLineHeight,
    align: ChartStyleToken.ChartSubtitleAlign,
  },
  {
    foreground: ChartStyleToken.ChartCaptionForeground,
    fontSize: ChartStyleToken.ChartCaptionFontSize,
    fontWeight: ChartStyleToken.ChartCaptionFontWeight,
    lineHeight: ChartStyleToken.ChartCaptionLineHeight,
    align: ChartStyleToken.ChartCaptionAlign,
  },
  {
    foreground: ChartStyleToken.ChartNoteForeground,
    fontSize: ChartStyleToken.ChartNoteFontSize,
    fontWeight: ChartStyleToken.ChartNoteFontWeight,
    lineHeight: ChartStyleToken.ChartNoteLineHeight,
    align: ChartStyleToken.ChartNoteAlign,
  },
  {
    foreground: ChartStyleToken.ChartSourceForeground,
    fontSize: ChartStyleToken.ChartSourceFontSize,
    fontWeight: ChartStyleToken.ChartSourceFontWeight,
    lineHeight: ChartStyleToken.ChartSourceLineHeight,
    align: ChartStyleToken.ChartSourceAlign,
  },
  {
    foreground: ChartStyleToken.ChartCreditForeground,
    fontSize: ChartStyleToken.ChartCreditFontSize,
    fontWeight: ChartStyleToken.ChartCreditFontWeight,
    lineHeight: ChartStyleToken.ChartCreditLineHeight,
    align: ChartStyleToken.ChartCreditAlign,
  },
];

const presentationTokens = (
  style: ThemeStyleValue,
  paint: PresetPaint,
): Partial<Record<ChartStyleTokenValue, unknown>> =>
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

const createPreset = (style: ThemeStyleValue, mode: ThemeModeValue): IRChartResolvedStyleTokens => {
  const structure = structures[style];
  const paint = paints[style][mode];
  return ChartResolvedStyleTokensSchema.parse({
    [ChartStyleToken.ChartCanvasFill]: paint.canvas,
    [ChartStyleToken.ChartPadding]: structure.padding,
    [ChartStyleToken.ChartGap]: structure.gap,
    [ChartStyleToken.ChartFontFamily]: structure.fontFamily,
    ...presentationTokens(style, paint),
    [ChartStyleToken.ChartAxisEnabled]: true,
    [ChartStyleToken.ChartAxisGridEnabled]: structure.gridEnabled,
    [ChartStyleToken.ChartLegendEnabled]: true,
  });
};

const presets = Object.fromEntries(
  Object.values(ThemeStyle).map(style => [
    style,
    Object.fromEntries(Object.values(ThemeMode).map(mode => [mode, createPreset(style, mode)])),
  ]),
) as Record<ThemeStyleValue, Record<ThemeModeValue, IRChartResolvedStyleTokens>>;

/** 读取一个内建 Chart style/mode 的完整 token map */
export const getChartStylePreset = (style: ThemeStyleValue, mode: ThemeModeValue): IRChartResolvedStyleTokens =>
  structuredClone(presets[style][mode]);
