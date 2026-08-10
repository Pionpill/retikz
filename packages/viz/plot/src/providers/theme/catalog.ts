import type { BuiltinThemeStyleValue, CssColorValue, NonEmptyReadonlyArray, ThemeModeValue } from '@retikz/core';

import { resolveCoreThemeColors, ThemeMode, ThemeStyle } from '@retikz/core';

import type { IRPlotResolvedThemeTokens } from '../../schemas';

import { LegendSymbolFit, PlotResolvedThemeTokensSchema, PlotThemeToken } from '../../schemas';
import { PlotColorScheme } from '../scale/shared';

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
    fontFamily: 'Inter, Helvetica Neue, Arial, sans-serif',
    fontSize: 12,
    labelSize: 11,
    axisLineEnabled: false,
    tickMark: false,
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
    rampLength: 96,
    rampThickness: 10,
    symbolSize: 12,
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
    },
    [ThemeMode.Dark]: {
      surface: 'hsl(240, 5.88%, 10%)',
      foreground: 'hsl(0, 0%, 98.04%)',
      label: 'hsl(240, 4.88%, 83.92%)',
      axisLine: 'hsl(240, 5.26%, 26.08%)',
      tickLabel: 'hsl(240, 4.88%, 83.92%)',
      axisTitle: 'hsl(240, 5.88%, 90%)',
      grid: 'hsl(240, 5.26%, 26.08%)',
      gridOpacity: 0.55,
      legendTitle: 'hsl(240, 5.88%, 90%)',
      legendLabel: 'hsl(240, 4.88%, 83.92%)',
    },
  },
  [ThemeStyle.Academic]: {
    [ThemeMode.Light]: {
      surface: 'hsl(0, 0%, 100%)',
      foreground: 'hsl(215, 27.91%, 16.86%)',
      label: 'hsl(216.92, 19.12%, 26.67%)',
      axisLine: 'hsl(217.89, 10.61%, 64.9%)',
      tickLabel: 'hsl(215, 13.79%, 34.12%)',
      axisTitle: 'hsl(216.92, 19.12%, 26.67%)',
      grid: 'hsl(216, 12.2%, 83.92%)',
      gridOpacity: 0.6,
      legendTitle: 'hsl(216.92, 19.12%, 26.67%)',
      legendLabel: 'hsl(215, 13.79%, 34.12%)',
    },
    [ThemeMode.Dark]: {
      surface: 'hsl(220.91, 39.29%, 10.98%)',
      foreground: 'hsl(220, 13.04%, 90.98%)',
      label: 'hsl(216, 12.2%, 83.92%)',
      axisLine: 'hsl(215.38, 16.32%, 46.86%)',
      tickLabel: 'hsl(212.73, 26.83%, 83.92%)',
      axisTitle: 'hsl(214.29, 31.82%, 91.37%)',
      grid: 'hsl(215.29, 25%, 26.67%)',
      gridOpacity: 0.6,
      legendTitle: 'hsl(214.29, 31.82%, 91.37%)',
      legendLabel: 'hsl(212.73, 26.83%, 83.92%)',
    },
  },
  [ThemeStyle.Vibrant]: {
    [ThemeMode.Light]: {
      surface: 'hsl(215.29, 48.57%, 93.14%)',
      foreground: 'hsl(216.23, 38.69%, 26.86%)',
      label: 'hsl(216.23, 38.69%, 26.86%)',
      axisLine: 'hsl(205, 16.44%, 71.37%)',
      tickLabel: 'hsl(216.23, 38.69%, 26.86%)',
      axisTitle: 'hsl(216.23, 38.69%, 26.86%)',
      grid: 'hsl(0, 0%, 100%)',
      gridOpacity: 1,
      legendTitle: 'hsl(216.23, 38.69%, 26.86%)',
      legendLabel: 'hsl(210, 21.43%, 32.94%)',
    },
    [ThemeMode.Dark]: {
      surface: 'hsl(217.24, 32.58%, 17.45%)',
      foreground: 'hsl(210, 40%, 98.04%)',
      label: 'hsl(214.29, 31.82%, 91.37%)',
      axisLine: 'hsl(215.38, 16.32%, 46.86%)',
      tickLabel: 'hsl(214.29, 31.82%, 91.37%)',
      axisTitle: 'hsl(210, 40%, 96.08%)',
      grid: 'hsl(215.29, 19.32%, 34.51%)',
      gridOpacity: 1,
      legendTitle: 'hsl(210, 40%, 96.08%)',
      legendLabel: 'hsl(214.29, 31.82%, 91.37%)',
    },
  },
  [ThemeStyle.Clean]: {
    [ThemeMode.Light]: {
      surface: 'none',
      foreground: 'hsl(48, 7.46%, 13.14%)',
      label: 'hsl(45, 5.19%, 30.2%)',
      axisLine: 'hsl(43.64, 4.49%, 51.96%)',
      tickLabel: 'hsl(42, 5.15%, 38.04%)',
      axisTitle: 'hsl(45, 5.71%, 27.45%)',
      grid: 'hsl(41.54, 5.78%, 44.12%)',
      gridOpacity: 0.18,
      legendTitle: 'hsl(42.86, 5.98%, 22.94%)',
      legendLabel: 'hsl(42, 5.15%, 38.04%)',
    },
    [ThemeMode.Dark]: {
      surface: 'none',
      foreground: 'hsl(45, 23.53%, 93.33%)',
      label: 'hsl(45, 11.32%, 79.22%)',
      axisLine: 'hsl(41.54, 5.78%, 44.12%)',
      tickLabel: 'hsl(45, 8.7%, 72.94%)',
      axisTitle: 'hsl(45, 13.95%, 83.14%)',
      grid: 'hsl(42.86, 8.97%, 69.41%)',
      gridOpacity: 0.18,
      legendTitle: 'hsl(45, 17.14%, 86.27%)',
      legendLabel: 'hsl(45, 8.7%, 72.94%)',
    },
  },
};

const createPreset = (
  style: BuiltinThemeStyleValue,
  mode: ThemeModeValue,
  categorical: NonEmptyReadonlyArray<CssColorValue>,
): IRPlotResolvedThemeTokens => {
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
    [PlotThemeToken.PlotPaletteCategorical]: [...categorical],
    [PlotThemeToken.PlotPaletteSeries]: [...categorical],
    [PlotThemeToken.PlotPaletteSector]: [...categorical],
    [PlotThemeToken.PlotPaletteSequential]: structure.sequential,
    [PlotThemeToken.PlotPaletteDiverging]: structure.diverging,
  });
};

/** 读取一个内建 Plot style/mode 的完整 token map */
export const getPlotThemePreset = (
  style: BuiltinThemeStyleValue,
  mode: ThemeModeValue,
  categorical: NonEmptyReadonlyArray<CssColorValue> = resolveCoreThemeColors(style, mode).categorical,
): IRPlotResolvedThemeTokens => structuredClone(createPreset(style, mode, categorical));
