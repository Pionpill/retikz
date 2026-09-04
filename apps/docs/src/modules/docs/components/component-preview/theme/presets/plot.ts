import type { ResolvedTheme } from '@retikz/core';
import type { IRPlotAxisThemeTokenRules, IRPlotThemeTokenOverrides } from '@retikz/plot';

import {
  definePlotThemeStyle,
  PlotColorScheme,
  PlotShapePaletteSchema,
  PlotThemeToken,
  PlotThemeTokenOverridesSchema,
} from '@retikz/plot';

import { PreviewThemeStyle } from '../constants';

type ReferenceStyle = Exclude<(typeof PreviewThemeStyle)[keyof typeof PreviewThemeStyle], 'default'>;

const shapePalette = PlotShapePaletteSchema.parse([
  'circle',
  'rectangle',
  'diamond',
  { type: 'polygon', params: { sides: 8, rotate: 22.5 } },
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
  if (style === PreviewThemeStyle.Academic) {
    return [
      {
        select: { dimension: ['x', 'y'] },
        tokens: {
          [PlotThemeToken.AxisGridEnabled]: false,
          [PlotThemeToken.AxisGridIncludeDomain]: false,
        },
      },
    ];
  }
  if (style === PreviewThemeStyle.Clean) {
    return [
      {
        select: { dimension: ['x', 'y'] },
        tokens: {
          [PlotThemeToken.AxisGridEnabled]: false,
          [PlotThemeToken.AxisGridIncludeDomain]: false,
        },
      },
      { select: { dimension: 'y' }, tokens: { [PlotThemeToken.AxisGridEnabled]: true } },
    ];
  }
  return [
    {
      select: { dimension: ['x', 'y'] },
      tokens: {
        [PlotThemeToken.AxisGridEnabled]: true,
        [PlotThemeToken.AxisGridIncludeDomain]: false,
      },
    },
  ];
};

const tokensOf = (style: ReferenceStyle, theme: ResolvedTheme): IRPlotThemeTokenOverrides => {
  const preset = styles[style];
  const tickMark =
    preset.axis.tick === false
      ? false
      : { kind: 'line' as const, length: preset.axis.tick, line: { stroke: 'currentColor' } };
  return PlotThemeTokenOverridesSchema.parse({
    ...(preset.area[theme.mode] === 'none' ? {} : { [PlotThemeToken.PlotAreaFill]: preset.area[theme.mode] }),
    [PlotThemeToken.PlotTypographyFontFamily]: preset.fontFamily,
    ...(preset.fontSize === 12 ? {} : { [PlotThemeToken.PlotTypographyFontSize]: preset.fontSize }),
    ...(preset.axis.line ? {} : { [PlotThemeToken.AxisLineEnabled]: false }),
    [PlotThemeToken.AxisTickMark]: tickMark,
    ...(preset.axis.labelSize === 12 ? {} : { [PlotThemeToken.AxisTickLabelFontSize]: preset.axis.labelSize }),
    [PlotThemeToken.AxisTickLabelGap]: preset.axis.labelGap,
    ...(preset.axis.title ? {} : { [PlotThemeToken.AxisTitleEnabled]: false }),
    ...(preset.axis.titleSize === 12 ? {} : { [PlotThemeToken.AxisTitleFontSize]: preset.axis.titleSize }),
    ...(style === PreviewThemeStyle.Vibrant
      ? {
          [PlotThemeToken.AxisGridStroke]: theme.mode === 'light' ? '#FFFFFF' : '#000000',
          [PlotThemeToken.AxisGridDrawOpacity]: 1,
        }
      : {}),
    ...(preset.legend.titleSize === 12 ? {} : { [PlotThemeToken.LegendTitleFontSize]: preset.legend.titleSize }),
    ...(preset.legend.titleWeight === 600 ? {} : { [PlotThemeToken.LegendTitleFontWeight]: preset.legend.titleWeight }),
    ...(preset.legend.labelSize === 12 ? {} : { [PlotThemeToken.LegendLabelFontSize]: preset.legend.labelSize }),
    ...(preset.legend.swatch === 14 ? {} : { [PlotThemeToken.LegendSwatchSize]: preset.legend.swatch }),
    ...(preset.legend.gap === 6 ? {} : { [PlotThemeToken.LegendSwatchGap]: preset.legend.gap }),
    ...(preset.legend.entry === 6 ? {} : { [PlotThemeToken.LegendEntryGap]: preset.legend.entry }),
    ...(preset.legend.titleGap === 6 ? {} : { [PlotThemeToken.LegendTitleGap]: preset.legend.titleGap }),
    ...(preset.legend.ramp === 100 ? {} : { [PlotThemeToken.LegendRampLength]: preset.legend.ramp }),
    [PlotThemeToken.LegendRampThickness]: preset.legend.thickness,
    ...(preset.legend.symbol === 14 ? {} : { [PlotThemeToken.LegendSymbolSize]: preset.legend.symbol }),
    [PlotThemeToken.PlotPaletteSequential]: preset.sequential,
    ...(preset.diverging === PlotColorScheme.RdBu ? {} : { [PlotThemeToken.PlotPaletteDiverging]: preset.diverging }),
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
