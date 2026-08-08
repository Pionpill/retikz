import type { BuiltinThemeStyleValue, ThemeModeValue } from '@retikz/core';

import { ThemeMode, ThemeStyle } from '@retikz/core';

import type { IRPlotResolvedThemeTokens } from '../../schemas';

import { LegendSymbolFit, PlotResolvedThemeTokensSchema, PlotThemeToken } from '../../schemas';
import { DEFAULT_PLOT_COLORS, PlotColorScheme } from '../scale/shared';

type PresetStructure = Readonly<{
  fontFamily: string;
  fontSize: number;
  labelSize: number;
  axisLineEnabled: boolean;
  tickMark: IRPlotResolvedThemeTokens['axis.tick.mark'];
  tickLabelSize: number;
  tickLabelGap: number;
  axisTitleSize: number;
  legendTitleSize: number;
  legendTitleWeight: number;
  legendLabelSize: number;
  swatchSize: number;
  swatchGap: number;
  entryGap: number;
  titleGap: number;
  rampLength: number;
  rampThickness: number;
  symbolSize: number;
  sequential: string;
  diverging: string;
}>;

type PresetPaint = Readonly<{
  surface: string;
  foreground: string;
  label: string;
  axisLine: string;
  tickLabel: string;
  axisTitle: string;
  grid: string;
  gridOpacity: number;
  legendTitle: string;
  legendLabel: string;
  palette: ReadonlyArray<string>;
}>;

const structures: Record<BuiltinThemeStyleValue, PresetStructure> = {
  [ThemeStyle.Neutral]: {
    fontFamily: 'sans-serif',
    fontSize: 12,
    labelSize: 12,
    axisLineEnabled: true,
    tickMark: { kind: 'line', length: 6 },
    tickLabelSize: 12,
    tickLabelGap: 4,
    axisTitleSize: 12,
    legendTitleSize: 12,
    legendTitleWeight: 600,
    legendLabelSize: 12,
    swatchSize: 14,
    swatchGap: 6,
    entryGap: 6,
    titleGap: 6,
    rampLength: 100,
    rampThickness: 12,
    symbolSize: 14,
    sequential: PlotColorScheme.Viridis,
    diverging: PlotColorScheme.RdBu,
  },
  [ThemeStyle.Academic]: {
    fontFamily: 'Inter, Helvetica Neue, Arial, sans-serif',
    fontSize: 12,
    labelSize: 11,
    axisLineEnabled: true,
    tickMark: { kind: 'line', length: 4 },
    tickLabelSize: 11,
    tickLabelGap: 5,
    axisTitleSize: 12,
    legendTitleSize: 12,
    legendTitleWeight: 600,
    legendLabelSize: 11,
    swatchSize: 12,
    swatchGap: 6,
    entryGap: 6,
    titleGap: 6,
    rampLength: 100,
    rampThickness: 10,
    symbolSize: 12,
    sequential: PlotColorScheme.Cividis,
    diverging: PlotColorScheme.RdBu,
  },
  [ThemeStyle.Vibrant]: {
    fontFamily: 'Inter, Segoe UI, Arial, sans-serif',
    fontSize: 13,
    labelSize: 12,
    axisLineEnabled: false,
    tickMark: false,
    tickLabelSize: 12,
    tickLabelGap: 6,
    axisTitleSize: 13,
    legendTitleSize: 13,
    legendTitleWeight: 700,
    legendLabelSize: 12,
    swatchSize: 14,
    swatchGap: 7,
    entryGap: 8,
    titleGap: 8,
    rampLength: 112,
    rampThickness: 14,
    symbolSize: 14,
    sequential: PlotColorScheme.Turbo,
    diverging: PlotColorScheme.Spectral,
  },
  [ThemeStyle.Clean]: {
    fontFamily: 'system-ui, Segoe UI, sans-serif',
    fontSize: 11,
    labelSize: 10,
    axisLineEnabled: false,
    tickMark: false,
    tickLabelSize: 10,
    tickLabelGap: 4,
    axisTitleSize: 11,
    legendTitleSize: 11,
    legendTitleWeight: 600,
    legendLabelSize: 10,
    swatchSize: 10,
    swatchGap: 5,
    entryGap: 5,
    titleGap: 5,
    rampLength: 88,
    rampThickness: 8,
    symbolSize: 10,
    sequential: PlotColorScheme.Cividis,
    diverging: PlotColorScheme.RdBu,
  },
};

const paints: Record<BuiltinThemeStyleValue, Record<ThemeModeValue, PresetPaint>> = {
  [ThemeStyle.Neutral]: {
    [ThemeMode.Light]: {
      surface: 'none',
      foreground: 'currentColor',
      label: 'currentColor',
      axisLine: 'currentColor',
      tickLabel: 'currentColor',
      axisTitle: 'currentColor',
      grid: 'currentColor',
      gridOpacity: 0.15,
      legendTitle: 'currentColor',
      legendLabel: 'currentColor',
      palette: DEFAULT_PLOT_COLORS,
    },
    [ThemeMode.Dark]: {
      surface: '#18181B',
      foreground: '#FAFAFA',
      label: '#D4D4D8',
      axisLine: '#3F3F46',
      tickLabel: '#D4D4D8',
      axisTitle: '#E4E4E7',
      grid: '#3F3F46',
      gridOpacity: 0.55,
      legendTitle: '#E4E4E7',
      legendLabel: '#D4D4D8',
      palette: ['#4C78A8', '#59A14F', '#F28E2B', '#B07AA1', '#E15759'],
    },
  },
  [ThemeStyle.Academic]: {
    [ThemeMode.Light]: {
      surface: '#FFFFFF',
      foreground: '#1F2937',
      label: '#374151',
      axisLine: '#9CA3AF',
      tickLabel: '#4B5563',
      axisTitle: '#374151',
      grid: '#D1D5DB',
      gridOpacity: 0.6,
      legendTitle: '#374151',
      legendLabel: '#4B5563',
      palette: [
        '#4E79A7',
        '#F28E2B',
        '#E15759',
        '#76B7B2',
        '#59A14F',
        '#EDC948',
        '#B07AA1',
        '#FF9DA7',
        '#9C755F',
        '#BAB0AC',
      ],
    },
    [ThemeMode.Dark]: {
      surface: '#111827',
      foreground: '#E5E7EB',
      label: '#D1D5DB',
      axisLine: '#64748B',
      tickLabel: '#CBD5E1',
      axisTitle: '#E2E8F0',
      grid: '#334155',
      gridOpacity: 0.6,
      legendTitle: '#E2E8F0',
      legendLabel: '#CBD5E1',
      palette: [
        '#60A5FA',
        '#FDBA74',
        '#F87171',
        '#5EEAD4',
        '#86EFAC',
        '#FDE047',
        '#D8B4FE',
        '#FDA4AF',
        '#D6A77A',
        '#CBD5E1',
      ],
    },
  },
  [ThemeStyle.Vibrant]: {
    [ThemeMode.Light]: {
      surface: '#E5ECF6',
      foreground: '#2A3F5F',
      label: '#2A3F5F',
      axisLine: '#AAB8C2',
      tickLabel: '#2A3F5F',
      axisTitle: '#2A3F5F',
      grid: '#FFFFFF',
      gridOpacity: 1,
      legendTitle: '#2A3F5F',
      legendLabel: '#425466',
      palette: [
        '#636EFA',
        '#EF553B',
        '#00CC96',
        '#AB63FA',
        '#FFA15A',
        '#19D3F3',
        '#FF6692',
        '#B6E880',
        '#FF97FF',
        '#FECB52',
      ],
    },
    [ThemeMode.Dark]: {
      surface: '#1E293B',
      foreground: '#F8FAFC',
      label: '#E2E8F0',
      axisLine: '#64748B',
      tickLabel: '#E2E8F0',
      axisTitle: '#F1F5F9',
      grid: '#475569',
      gridOpacity: 1,
      legendTitle: '#F1F5F9',
      legendLabel: '#E2E8F0',
      palette: [
        '#636EFA',
        '#EF553B',
        '#00CC96',
        '#AB63FA',
        '#FFA15A',
        '#19D3F3',
        '#FF6692',
        '#B6E880',
        '#FF97FF',
        '#FECB52',
      ],
    },
  },
  [ThemeStyle.Clean]: {
    [ThemeMode.Light]: {
      surface: '#FFFFFF',
      foreground: '#111827',
      label: '#374151',
      axisLine: '#9CA3AF',
      tickLabel: '#374151',
      axisTitle: '#374151',
      grid: '#E5E7EB',
      gridOpacity: 1,
      legendTitle: '#374151',
      legendLabel: '#4B5563',
      palette: ['#0072B2', '#E69F00', '#009E73', '#CC79A7', '#56B4E9', '#D55E00', '#F0E442', '#000000'],
    },
    [ThemeMode.Dark]: {
      surface: '#0B0F14',
      foreground: '#F3F4F6',
      label: '#D1D5DB',
      axisLine: '#6B7280',
      tickLabel: '#D1D5DB',
      axisTitle: '#E5E7EB',
      grid: '#374151',
      gridOpacity: 1,
      legendTitle: '#E5E7EB',
      legendLabel: '#D1D5DB',
      palette: ['#56B4E9', '#F0B44D', '#4DD4AC', '#E58AC8', '#7AC7F0', '#FF7A59', '#F6E36B', '#E5E7EB'],
    },
  },
};

const createPreset = (style: BuiltinThemeStyleValue, mode: ThemeModeValue): IRPlotResolvedThemeTokens => {
  const structure = structures[style];
  const paint = paints[style][mode];
  const tickMark =
    structure.tickMark !== false && structure.tickMark.kind === 'line'
      ? {
          ...structure.tickMark,
          line: { ...(structure.tickMark.line === false ? {} : structure.tickMark.line), stroke: paint.axisLine },
        }
      : structure.tickMark;
  return PlotResolvedThemeTokensSchema.parse({
    [PlotThemeToken.PlotSurfaceFill]: paint.surface,
    [PlotThemeToken.PlotTypographyForeground]: paint.foreground,
    [PlotThemeToken.PlotTypographyFontFamily]: structure.fontFamily,
    [PlotThemeToken.PlotTypographyFontSize]: structure.fontSize,
    [PlotThemeToken.PlotLabelForeground]: paint.label,
    [PlotThemeToken.PlotLabelFontSize]: structure.labelSize,
    [PlotThemeToken.AxisLineEnabled]: structure.axisLineEnabled,
    [PlotThemeToken.AxisLineStroke]: paint.axisLine,
    [PlotThemeToken.AxisLineStrokeWidth]: 1,
    [PlotThemeToken.AxisLineDrawOpacity]: 1,
    [PlotThemeToken.AxisTickMark]: tickMark,
    [PlotThemeToken.AxisTickLabelEnabled]: true,
    [PlotThemeToken.AxisTickLabelForeground]: paint.tickLabel,
    [PlotThemeToken.AxisTickLabelFontSize]: structure.tickLabelSize,
    [PlotThemeToken.AxisTickLabelGap]: structure.tickLabelGap,
    [PlotThemeToken.AxisTitleForeground]: paint.axisTitle,
    [PlotThemeToken.AxisTitleFontSize]: structure.axisTitleSize,
    [PlotThemeToken.AxisTitleFontWeight]: 600,
    [PlotThemeToken.AxisGridStroke]: paint.grid,
    [PlotThemeToken.AxisGridStrokeWidth]: 1,
    [PlotThemeToken.AxisGridDrawOpacity]: paint.gridOpacity,
    [PlotThemeToken.LegendTitleForeground]: paint.legendTitle,
    [PlotThemeToken.LegendTitleFontSize]: structure.legendTitleSize,
    [PlotThemeToken.LegendTitleFontWeight]: structure.legendTitleWeight,
    [PlotThemeToken.LegendLabelForeground]: paint.legendLabel,
    [PlotThemeToken.LegendLabelFontSize]: structure.legendLabelSize,
    [PlotThemeToken.LegendSwatchSize]: structure.swatchSize,
    [PlotThemeToken.LegendSwatchGap]: structure.swatchGap,
    [PlotThemeToken.LegendEntryGap]: structure.entryGap,
    [PlotThemeToken.LegendTitleGap]: structure.titleGap,
    [PlotThemeToken.LegendRampLength]: structure.rampLength,
    [PlotThemeToken.LegendRampThickness]: structure.rampThickness,
    [PlotThemeToken.LegendSymbolSize]: structure.symbolSize,
    [PlotThemeToken.LegendSymbolScale]: 1,
    [PlotThemeToken.LegendSymbolFit]: LegendSymbolFit.Fit,
    [PlotThemeToken.PlotPaletteCategorical]: [...paint.palette],
    [PlotThemeToken.PlotPaletteSeries]: [...paint.palette],
    [PlotThemeToken.PlotPaletteSector]: [...paint.palette],
    [PlotThemeToken.PlotPaletteSequential]: structure.sequential,
    [PlotThemeToken.PlotPaletteDiverging]: structure.diverging,
  });
};

const presets = Object.fromEntries(
  Object.values(ThemeStyle).map(style => [
    style,
    Object.fromEntries(Object.values(ThemeMode).map(mode => [mode, createPreset(style, mode)])),
  ]),
) as Record<BuiltinThemeStyleValue, Record<ThemeModeValue, IRPlotResolvedThemeTokens>>;

/** 读取一个内建 Plot style/mode 的完整 token map */
export const getPlotThemePreset = (style: BuiltinThemeStyleValue, mode: ThemeModeValue): IRPlotResolvedThemeTokens =>
  structuredClone(presets[style][mode]);
