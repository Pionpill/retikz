import type { ValueOf } from '@retikz/foundation';

/** Chart presentation 与 recipe 默认值的 canonical token key */
export const ChartThemeToken = {
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
  ChartAxisEnabled: 'chart.axis.enabled',
  ChartAxisGridEnabled: 'chart.axis.grid.enabled',
  ChartLegendEnabled: 'chart.legend.enabled',
} as const;

/** Chart style token 的最终来源层 */
export const ChartThemeTokenSource = {
  /** effective Theme 选择的内建 preset */
  Preset: 'preset',
  /** Core effective Theme 继承的 Chart token */
  /** 当前 Chart 输入的稀疏 token 覆盖 */
  Local: 'local',
} as const;

/** Chart style token 最终来源层取值 */
export type ChartThemeTokenSourceValue = ValueOf<typeof ChartThemeTokenSource>;
