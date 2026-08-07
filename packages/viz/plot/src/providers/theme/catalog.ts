import type { ThemeModeValue, ThemeStyleValue } from '@retikz/core';

import { ThemeMode, ThemeStyle } from '@retikz/core';

import type { IRPlotResolvedStyleTokens } from '../../schemas';

import { LegendSymbolFit, PlotResolvedStyleTokensSchema, PlotStyleToken } from '../../schemas';
import { DEFAULT_PLOT_COLORS, PlotColorScheme } from '../scale/shared';

type PresetStructure = Readonly<{
  fontFamily: string;
  fontSize: number;
  labelSize: number;
  axisLineEnabled: boolean;
  tickMark: IRPlotResolvedStyleTokens['axis.tick.mark'];
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

const structures: Record<ThemeStyleValue, PresetStructure> = {
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

const paints: Record<ThemeStyleValue, Record<ThemeModeValue, PresetPaint>> = {
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

const createPreset = (style: ThemeStyleValue, mode: ThemeModeValue): IRPlotResolvedStyleTokens => {
  const structure = structures[style];
  const paint = paints[style][mode];
  const tickMark =
    structure.tickMark !== false && structure.tickMark.kind === 'line'
      ? {
          ...structure.tickMark,
          line: { ...(structure.tickMark.line === false ? {} : structure.tickMark.line), stroke: paint.axisLine },
        }
      : structure.tickMark;
  return PlotResolvedStyleTokensSchema.parse({
    [PlotStyleToken.PlotSurfaceFill]: paint.surface,
    [PlotStyleToken.PlotTypographyForeground]: paint.foreground,
    [PlotStyleToken.PlotTypographyFontFamily]: structure.fontFamily,
    [PlotStyleToken.PlotTypographyFontSize]: structure.fontSize,
    [PlotStyleToken.PlotLabelForeground]: paint.label,
    [PlotStyleToken.PlotLabelFontSize]: structure.labelSize,
    [PlotStyleToken.AxisLineEnabled]: structure.axisLineEnabled,
    [PlotStyleToken.AxisLineStroke]: paint.axisLine,
    [PlotStyleToken.AxisLineStrokeWidth]: 1,
    [PlotStyleToken.AxisLineDrawOpacity]: 1,
    [PlotStyleToken.AxisTickMark]: tickMark,
    [PlotStyleToken.AxisTickLabelEnabled]: true,
    [PlotStyleToken.AxisTickLabelForeground]: paint.tickLabel,
    [PlotStyleToken.AxisTickLabelFontSize]: structure.tickLabelSize,
    [PlotStyleToken.AxisTickLabelGap]: structure.tickLabelGap,
    [PlotStyleToken.AxisTitleForeground]: paint.axisTitle,
    [PlotStyleToken.AxisTitleFontSize]: structure.axisTitleSize,
    [PlotStyleToken.AxisTitleFontWeight]: 600,
    [PlotStyleToken.AxisGridStroke]: paint.grid,
    [PlotStyleToken.AxisGridStrokeWidth]: 1,
    [PlotStyleToken.AxisGridDrawOpacity]: paint.gridOpacity,
    [PlotStyleToken.LegendTitleForeground]: paint.legendTitle,
    [PlotStyleToken.LegendTitleFontSize]: structure.legendTitleSize,
    [PlotStyleToken.LegendTitleFontWeight]: structure.legendTitleWeight,
    [PlotStyleToken.LegendLabelForeground]: paint.legendLabel,
    [PlotStyleToken.LegendLabelFontSize]: structure.legendLabelSize,
    [PlotStyleToken.LegendSwatchSize]: structure.swatchSize,
    [PlotStyleToken.LegendSwatchGap]: structure.swatchGap,
    [PlotStyleToken.LegendEntryGap]: structure.entryGap,
    [PlotStyleToken.LegendTitleGap]: structure.titleGap,
    [PlotStyleToken.LegendRampLength]: structure.rampLength,
    [PlotStyleToken.LegendRampThickness]: structure.rampThickness,
    [PlotStyleToken.LegendSymbolSize]: structure.symbolSize,
    [PlotStyleToken.LegendSymbolScale]: 1,
    [PlotStyleToken.LegendSymbolFit]: LegendSymbolFit.Fit,
    [PlotStyleToken.PlotPaletteCategorical]: [...paint.palette],
    [PlotStyleToken.PlotPaletteSeries]: [...paint.palette],
    [PlotStyleToken.PlotPaletteSector]: [...paint.palette],
    [PlotStyleToken.PlotPaletteSequential]: structure.sequential,
    [PlotStyleToken.PlotPaletteDiverging]: structure.diverging,
  });
};

const presets = Object.fromEntries(
  Object.values(ThemeStyle).map(style => [
    style,
    Object.fromEntries(Object.values(ThemeMode).map(mode => [mode, createPreset(style, mode)])),
  ]),
) as Record<ThemeStyleValue, Record<ThemeModeValue, IRPlotResolvedStyleTokens>>;

/** 读取一个内建 Plot style/mode 的完整 token map */
export const getPlotStylePreset = (style: ThemeStyleValue, mode: ThemeModeValue): IRPlotResolvedStyleTokens =>
  structuredClone(presets[style][mode]);
