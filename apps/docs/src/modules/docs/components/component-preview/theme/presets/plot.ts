import type { ResolvedTheme } from '@retikz/core';
import type { IRPlotAxisThemeTokenRules, IRPlotThemeTokenResolution } from '@retikz/plot';

import {
  definePlotThemeStyle,
  LegendSymbolFit,
  PlotColorScheme,
  PlotThemeTokenResolutionSchema,
  PlotShapePaletteSchema,
  PlotThemeToken,
} from '@retikz/plot';

import { PreviewThemeStyle } from '../constants';

type ReferenceStyle = Exclude<(typeof PreviewThemeStyle)[keyof typeof PreviewThemeStyle], 'default'>;

const shapePalette = PlotShapePaletteSchema.parse([
  'circle',
  'rectangle',
  'diamond',
  'cross',
  { type: 'polygon', params: { sides: 3, rotate: -90 } },
  { type: 'polygon', params: { sides: 3, rotate: 90 } },
  { type: 'polygon', params: { sides: 5, rotate: -90 } },
  { type: 'polygon', params: { sides: 6, rotate: 0 } },
]);

const styles = {
  academic: {
    area: { light: 'none', dark: 'none' },
    fontFamily: 'Inter, Helvetica Neue, Arial, sans-serif',
    fontSize: 12,
    axis: { line: true, tick: 4, labelSize: 11, labelGap: 5, title: true, titleSize: 12, grid: false },
    legend: {
      titleSize: 12,
      titleWeight: 600,
      labelSize: 11,
      swatch: 12,
      gap: 6,
      entry: 6,
      titleGap: 6,
      ramp: 100,
      thickness: 10,
      symbol: 12,
    },
    sequential: PlotColorScheme.Cividis,
    diverging: PlotColorScheme.RdBu,
  },
  vibrant: {
    area: { light: '#E5ECF6', dark: '#111111' },
    fontFamily: 'Inter, Segoe UI, Arial, sans-serif',
    fontSize: 13,
    axis: { line: false, tick: false, labelSize: 12, labelGap: 6, title: true, titleSize: 13, grid: false },
    legend: {
      titleSize: 13,
      titleWeight: 700,
      labelSize: 12,
      swatch: 14,
      gap: 7,
      entry: 8,
      titleGap: 8,
      ramp: 112,
      thickness: 14,
      symbol: 14,
    },
    sequential: PlotColorScheme.Turbo,
    diverging: PlotColorScheme.Spectral,
  },
  clean: {
    area: { light: 'none', dark: 'none' },
    fontFamily: 'Inter, Helvetica Neue, Arial, sans-serif',
    fontSize: 12,
    axis: { line: false, tick: false, labelSize: 11, labelGap: 5, title: false, titleSize: 12, grid: false },
    legend: {
      titleSize: 12,
      titleWeight: 600,
      labelSize: 11,
      swatch: 12,
      gap: 6,
      entry: 6,
      titleGap: 6,
      ramp: 96,
      thickness: 10,
      symbol: 12,
    },
    sequential: PlotColorScheme.Cividis,
    diverging: PlotColorScheme.RdBu,
  },
} as const;

const tokenRulesOf = (style: ReferenceStyle): IRPlotAxisThemeTokenRules => {
  if (style === PreviewThemeStyle.Academic) return [];
  if (style === PreviewThemeStyle.Clean) {
    return [{ select: { dimension: 'y' }, tokens: { [PlotThemeToken.AxisGridEnabled]: true } }];
  }
  return [
    {
      select: { dimension: ['x', 'y'] },
      tokens: { [PlotThemeToken.AxisGridEnabled]: true },
    },
  ];
};

const tokensOf = (style: ReferenceStyle, theme: ResolvedTheme): IRPlotThemeTokenResolution => {
  const preset = styles[style];
  const tickMark =
    preset.axis.tick === false
      ? false
      : { kind: 'line' as const, length: preset.axis.tick, line: { stroke: 'currentColor' } };
  const categorical = [...theme.colors.categorical];
  return PlotThemeTokenResolutionSchema.parse({
    [PlotThemeToken.PlotAreaFill]: preset.area[theme.mode],
    [PlotThemeToken.PlotTypographyForeground]: 'currentColor',
    [PlotThemeToken.PlotTypographyFontFamily]: preset.fontFamily,
    [PlotThemeToken.PlotTypographyFontSize]: preset.fontSize,
    [PlotThemeToken.AxisLineEnabled]: preset.axis.line,
    [PlotThemeToken.AxisLineStroke]: 'currentColor',
    [PlotThemeToken.AxisLineStrokeWidth]: 1,
    [PlotThemeToken.AxisLineDrawOpacity]: 1,
    [PlotThemeToken.AxisTickMark]: tickMark,
    [PlotThemeToken.AxisTickLabelEnabled]: true,
    [PlotThemeToken.AxisTickLabelForeground]: 'currentColor',
    [PlotThemeToken.AxisTickLabelFontSize]: preset.axis.labelSize,
    [PlotThemeToken.AxisTickLabelGap]: preset.axis.labelGap,
    [PlotThemeToken.AxisTitleEnabled]: preset.axis.title,
    [PlotThemeToken.AxisTitleForeground]: 'currentColor',
    [PlotThemeToken.AxisTitleFontSize]: preset.axis.titleSize,
    [PlotThemeToken.AxisTitleFontWeight]: 600,
    [PlotThemeToken.AxisTitlePadding]: 12,
    [PlotThemeToken.AxisGridEnabled]: preset.axis.grid,
    [PlotThemeToken.AxisGridStroke]:
      style === PreviewThemeStyle.Vibrant ? (theme.mode === 'light' ? '#FFFFFF' : '#000000') : 'currentColor',
    [PlotThemeToken.AxisGridStrokeWidth]: 1,
    [PlotThemeToken.AxisGridDrawOpacity]: style === PreviewThemeStyle.Vibrant ? 1 : 0.15,
    [PlotThemeToken.AxisGridIncludeDomain]: false,
    [PlotThemeToken.LegendTitleForeground]: 'currentColor',
    [PlotThemeToken.LegendTitleFontSize]: preset.legend.titleSize,
    [PlotThemeToken.LegendTitleFontWeight]: preset.legend.titleWeight,
    [PlotThemeToken.LegendLabelForeground]: 'currentColor',
    [PlotThemeToken.LegendLabelFontSize]: preset.legend.labelSize,
    [PlotThemeToken.LegendSwatchSize]: preset.legend.swatch,
    [PlotThemeToken.LegendSwatchGap]: preset.legend.gap,
    [PlotThemeToken.LegendEntryGap]: preset.legend.entry,
    [PlotThemeToken.LegendTitleGap]: preset.legend.titleGap,
    [PlotThemeToken.LegendRampLength]: preset.legend.ramp,
    [PlotThemeToken.LegendRampThickness]: preset.legend.thickness,
    [PlotThemeToken.LegendSymbolSize]: preset.legend.symbol,
    [PlotThemeToken.LegendSymbolScale]: 1,
    [PlotThemeToken.LegendSymbolFit]: LegendSymbolFit.Fit,
    [PlotThemeToken.PlotPaletteCategorical]: categorical,
    [PlotThemeToken.PlotPaletteSeries]: categorical,
    [PlotThemeToken.PlotPaletteSector]: categorical,
    [PlotThemeToken.PlotPaletteSequential]: preset.sequential,
    [PlotThemeToken.PlotPaletteDiverging]: preset.diverging,
    [PlotThemeToken.PlotPaletteShape]: structuredClone(shapePalette),
  });
};

/** docs 维护的三个 Plot reference Theme definitions */
export const PreviewPlotThemeStyles = [
  PreviewThemeStyle.Academic,
  PreviewThemeStyle.Vibrant,
  PreviewThemeStyle.Clean,
].map(style =>
  definePlotThemeStyle({
    name: style,
    resolve: theme => ({ tokens: tokensOf(style, theme), tokenRules: tokenRulesOf(style) }),
  }),
);
