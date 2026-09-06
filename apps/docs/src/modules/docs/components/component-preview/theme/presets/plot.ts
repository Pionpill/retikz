import type { ResolvedTheme, ThemeModeValue } from '@retikz/core';
import type { IRPlotAxisRule, IRPlotDefaults } from '@retikz/plot';

import { definePlotThemeStyle, PlotColorScheme, PlotDefaultsSchema, PlotShapePaletteSchema } from '@retikz/plot';

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
    axis: { line: true, tick: 4, labelSize: 11, labelGap: 5, title: true, titleSize: 12 },
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
    axis: { line: false, tick: false, labelSize: 12, labelGap: 6, title: true, titleSize: 13 },
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
    axis: { line: false, tick: false, labelSize: 11, labelGap: 5, title: false, titleSize: 12 },
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

const gridDefaultsOf = (mode: ThemeModeValue) => ({
  stroke: mode === 'light' ? '#FFFFFF' : '#000000',
  strokeWidth: 1,
  drawOpacity: 1,
  includeDomain: false,
});

const rulesOf = (style: ReferenceStyle, mode: ThemeModeValue): ReadonlyArray<IRPlotAxisRule> => {
  if (style === PreviewThemeStyle.Academic) {
    return [{ select: { dimension: ['x', 'y'] }, axis: { grid: false } }];
  }
  if (style === PreviewThemeStyle.Clean) {
    return [
      { select: { dimension: ['x', 'y'] }, axis: { grid: false } },
      {
        select: { dimension: 'y' },
        axis: { grid: { stroke: 'currentColor', strokeWidth: 1, drawOpacity: 0.15, includeDomain: true } },
      },
    ];
  }
  return [{ select: { dimension: ['x', 'y'] }, axis: { grid: gridDefaultsOf(mode) } }];
};

const defaultsOf = (style: ReferenceStyle, theme: ResolvedTheme): IRPlotDefaults => {
  const preset = styles[style];
  const tickMark =
    preset.axis.tick === false
      ? { kind: 'line' as const, length: 0, line: false as const }
      : { kind: 'line' as const, length: preset.axis.tick, line: { stroke: 'currentColor' } };
  return PlotDefaultsSchema.parse({
    ...(preset.area[theme.mode] === 'none' ? {} : { plotArea: { fill: preset.area[theme.mode] } }),
    typography: { font: { family: preset.fontFamily, size: preset.fontSize } },
    axis: {
      ...(preset.axis.line ? {} : { line: false }),
      ticks: { mark: tickMark },
      tickLabels: { font: { size: preset.axis.labelSize }, gap: preset.axis.labelGap },
      title: preset.axis.title ? { font: { size: preset.axis.titleSize } } : false,
    },
    legend: {
      title: { font: { size: preset.legend.titleSize, weight: preset.legend.titleWeight } },
      label: { font: { size: preset.legend.labelSize } },
      swatchSize: preset.legend.swatch,
      swatchGap: preset.legend.gap,
      entryGap: preset.legend.entry,
      titleGap: preset.legend.titleGap,
      rampLength: preset.legend.ramp,
      rampThickness: preset.legend.thickness,
      symbolSize: preset.legend.symbol,
    },
    palette: { sequential: preset.sequential, diverging: preset.diverging, shape: structuredClone(shapePalette) },
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
    resolve: theme => ({ defaults: defaultsOf(style, theme), rules: rulesOf(style, theme.mode) }),
  }),
);
