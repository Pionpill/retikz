import type { BuiltinThemeStyleValue, CssColorValue, NonEmptyReadonlyArray, ThemeModeValue } from '@retikz/core';

import { resolveCoreThemeColors } from '@retikz/core';

import type { IRPlotResolvedThemeTokens } from '../../schemas';

import { PlotResolvedThemeTokensSchema, PlotThemeToken } from '../../schemas';
import { getAxisPreset, getLegendPreset, getPalettePreset, getPlotPreset } from './preset';

const createPreset = (
  style: BuiltinThemeStyleValue,
  mode: ThemeModeValue,
  categorical: NonEmptyReadonlyArray<CssColorValue>,
): IRPlotResolvedThemeTokens => {
  const plot = getPlotPreset(style, mode);
  const axis = getAxisPreset(style, mode);
  const legend = getLegendPreset(style, mode);
  const palette = getPalettePreset(style);

  return PlotResolvedThemeTokensSchema.parse({
    [PlotThemeToken.PlotSurfaceFill]: plot.surface,
    [PlotThemeToken.PlotTypographyForeground]: plot.foreground,
    [PlotThemeToken.PlotTypographyFontFamily]: plot.fontFamily,
    [PlotThemeToken.PlotTypographyFontSize]: plot.fontSize,
    [PlotThemeToken.AxisLineEnabled]: axis.lineEnabled,
    [PlotThemeToken.AxisLineStroke]: axis.lineStroke,
    [PlotThemeToken.AxisLineStrokeWidth]: axis.lineStrokeWidth,
    [PlotThemeToken.AxisLineDrawOpacity]: axis.lineDrawOpacity,
    [PlotThemeToken.AxisTickMark]: axis.tickMark,
    [PlotThemeToken.AxisTickLabelEnabled]: axis.tickLabelEnabled,
    [PlotThemeToken.AxisTickLabelForeground]: axis.tickLabelForeground,
    [PlotThemeToken.AxisTickLabelFontSize]: axis.tickLabelFontSize,
    [PlotThemeToken.AxisTickLabelGap]: axis.tickLabelGap,
    [PlotThemeToken.AxisTitleForeground]: axis.titleForeground,
    [PlotThemeToken.AxisTitleFontSize]: axis.titleFontSize,
    [PlotThemeToken.AxisTitleFontWeight]: axis.titleFontWeight,
    [PlotThemeToken.AxisGridStroke]: axis.gridStroke,
    [PlotThemeToken.AxisGridStrokeWidth]: axis.gridStrokeWidth,
    [PlotThemeToken.AxisGridDrawOpacity]: axis.gridDrawOpacity,
    [PlotThemeToken.LegendTitleForeground]: legend.titleForeground,
    [PlotThemeToken.LegendTitleFontSize]: legend.titleFontSize,
    [PlotThemeToken.LegendTitleFontWeight]: legend.titleFontWeight,
    [PlotThemeToken.LegendLabelForeground]: legend.labelForeground,
    [PlotThemeToken.LegendLabelFontSize]: legend.labelFontSize,
    [PlotThemeToken.LegendSwatchSize]: legend.swatchSize,
    [PlotThemeToken.LegendSwatchGap]: legend.swatchGap,
    [PlotThemeToken.LegendEntryGap]: legend.entryGap,
    [PlotThemeToken.LegendTitleGap]: legend.titleGap,
    [PlotThemeToken.LegendRampLength]: legend.rampLength,
    [PlotThemeToken.LegendRampThickness]: legend.rampThickness,
    [PlotThemeToken.LegendSymbolSize]: legend.symbolSize,
    [PlotThemeToken.LegendSymbolScale]: legend.symbolScale,
    [PlotThemeToken.LegendSymbolFit]: legend.symbolFit,
    [PlotThemeToken.PlotPaletteCategorical]: [...categorical],
    [PlotThemeToken.PlotPaletteSeries]: [...categorical],
    [PlotThemeToken.PlotPaletteSector]: [...categorical],
    [PlotThemeToken.PlotPaletteSequential]: palette.sequential,
    [PlotThemeToken.PlotPaletteDiverging]: palette.diverging,
  });
};

/** 读取一个内建 Plot style/mode 的完整 token map */
export const getPlotThemePreset = (
  style: BuiltinThemeStyleValue,
  mode: ThemeModeValue,
  categorical: NonEmptyReadonlyArray<CssColorValue> = resolveCoreThemeColors(style, mode).categorical,
): IRPlotResolvedThemeTokens => structuredClone(createPreset(style, mode, categorical));
