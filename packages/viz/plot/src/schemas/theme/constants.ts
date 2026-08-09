import type { ValueOf } from '@retikz/foundation';

/** Plot 主题 token 的 canonical key */
export const PlotThemeToken = {
  PlotSurfaceFill: 'plot.surface.fill',
  PlotTypographyForeground: 'plot.typography.foreground',
  PlotTypographyFontFamily: 'plot.typography.font.family',
  PlotTypographyFontSize: 'plot.typography.font.size',
  PlotLabelForeground: 'plot.label.foreground',
  PlotLabelFontSize: 'plot.label.font.size',
  AxisLineEnabled: 'axis.line.enabled',
  AxisLineStroke: 'axis.line.stroke',
  AxisLineStrokeWidth: 'axis.line.strokeWidth',
  AxisLineDrawOpacity: 'axis.line.drawOpacity',
  AxisTickMark: 'axis.tick.mark',
  AxisTickLabelEnabled: 'axis.tickLabel.enabled',
  AxisTickLabelForeground: 'axis.tickLabel.foreground',
  AxisTickLabelFontSize: 'axis.tickLabel.font.size',
  AxisTickLabelGap: 'axis.tickLabel.gap',
  AxisTitleForeground: 'axis.title.foreground',
  AxisTitleFontSize: 'axis.title.font.size',
  AxisTitleFontWeight: 'axis.title.font.weight',
  AxisGridStroke: 'axis.grid.stroke',
  AxisGridStrokeWidth: 'axis.grid.strokeWidth',
  AxisGridDrawOpacity: 'axis.grid.drawOpacity',
  LegendTitleForeground: 'legend.title.foreground',
  LegendTitleFontSize: 'legend.title.font.size',
  LegendTitleFontWeight: 'legend.title.font.weight',
  LegendLabelForeground: 'legend.label.foreground',
  LegendLabelFontSize: 'legend.label.font.size',
  LegendSwatchSize: 'legend.swatch.size',
  LegendSwatchGap: 'legend.swatch.gap',
  LegendEntryGap: 'legend.entry.gap',
  LegendTitleGap: 'legend.title.gap',
  LegendRampLength: 'legend.ramp.length',
  LegendRampThickness: 'legend.ramp.thickness',
  LegendSymbolSize: 'legend.symbol.size',
  LegendSymbolScale: 'legend.symbol.scale',
  LegendSymbolFit: 'legend.symbol.fit',
  PlotPaletteCategorical: 'plot.palette.categorical',
  PlotPaletteSeries: 'plot.palette.series',
  PlotPaletteSector: 'plot.palette.sector',
  PlotPaletteSequential: 'plot.palette.sequential',
  PlotPaletteDiverging: 'plot.palette.diverging',
} as const;

/** Plot 主题 token key 取值 */
export type PlotThemeTokenValue = ValueOf<typeof PlotThemeToken>;

/** Plot token 最终来源分类 */
export const PlotThemeTokenSource = {
  Preset: 'preset',
  SharedCategorical: 'shared-categorical',
  Local: 'local',
  Colors: 'colors',
  PlotTheme: 'plot-theme',
} as const;

/** Plot token 最终来源分类取值 */
export type PlotThemeTokenSourceValue = ValueOf<typeof PlotThemeTokenSource>;
