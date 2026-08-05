import type { ValueOf } from '@retikz/core';

/** Chart 样式 token 的 canonical key */
export const ChartStyleToken = {
  ChartCanvasFill: 'chart.canvas.fill',
  ChartPadding: 'chart.padding',
  ChartGap: 'chart.gap',
  ChartFontFamily: 'chart.font.family',
  ChartTitleForeground: 'chart.title.foreground',
  ChartTitleFontSize: 'chart.title.font.size',
  ChartTitleFontWeight: 'chart.title.font.weight',
  ChartTitleLineHeight: 'chart.title.lineHeight',
  ChartTitleAlign: 'chart.title.align',
  ChartSubtitleForeground: 'chart.subtitle.foreground',
  ChartSubtitleFontSize: 'chart.subtitle.font.size',
  ChartSubtitleFontWeight: 'chart.subtitle.font.weight',
  ChartSubtitleLineHeight: 'chart.subtitle.lineHeight',
  ChartSubtitleAlign: 'chart.subtitle.align',
  ChartCaptionForeground: 'chart.caption.foreground',
  ChartCaptionFontSize: 'chart.caption.font.size',
  ChartCaptionFontWeight: 'chart.caption.font.weight',
  ChartCaptionLineHeight: 'chart.caption.lineHeight',
  ChartCaptionAlign: 'chart.caption.align',
  ChartNoteForeground: 'chart.note.foreground',
  ChartNoteFontSize: 'chart.note.font.size',
  ChartNoteFontWeight: 'chart.note.font.weight',
  ChartNoteLineHeight: 'chart.note.lineHeight',
  ChartNoteAlign: 'chart.note.align',
  ChartSourceForeground: 'chart.source.foreground',
  ChartSourceFontSize: 'chart.source.font.size',
  ChartSourceFontWeight: 'chart.source.font.weight',
  ChartSourceLineHeight: 'chart.source.lineHeight',
  ChartSourceAlign: 'chart.source.align',
  ChartCreditForeground: 'chart.credit.foreground',
  ChartCreditFontSize: 'chart.credit.font.size',
  ChartCreditFontWeight: 'chart.credit.font.weight',
  ChartCreditLineHeight: 'chart.credit.lineHeight',
  ChartCreditAlign: 'chart.credit.align',
  PlotSurfaceFill: 'plot.surface.fill',
  PlotForeground: 'plot.foreground',
  PlotLabelForeground: 'plot.label.foreground',
  PlotLabelFontSize: 'plot.label.font.size',
  AxisEnabled: 'axis.enabled',
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
  AxisGridEnabled: 'axis.grid.enabled',
  AxisGridStroke: 'axis.grid.stroke',
  AxisGridStrokeWidth: 'axis.grid.strokeWidth',
  AxisGridDrawOpacity: 'axis.grid.drawOpacity',
  LegendEnabled: 'legend.enabled',
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
  DataPaletteCategorical: 'data.palette.categorical',
  DataPaletteSeries: 'data.palette.series',
  DataPaletteSector: 'data.palette.sector',
  DataPaletteSequential: 'data.palette.sequential',
  DataPaletteDiverging: 'data.palette.diverging',
} as const;

/** Chart style token 的最终来源层 */
export const ChartStyleTokenSource = {
  /** 内建 preset 与 mode */
  Preset: 'preset',
  /** 用户稀疏 token 覆盖 */
  StyleToken: 'style-token',
} as const;

/** Chart style token 最终来源层取值 */
export type ChartStyleTokenSourceValue = ValueOf<typeof ChartStyleTokenSource>;

/** Chart style 之后继续参与 Plot theme cascade 的用户入口 */
export const ChartStyleAuthoredOverride = {
  /** Plot colors 简写 */
  Colors: 'colors',
  /** 原生 Plot theme */
  Theme: 'theme',
} as const;

/** Chart style 后续用户覆盖入口取值 */
export type ChartStyleAuthoredOverrideValue = ValueOf<typeof ChartStyleAuthoredOverride>;
