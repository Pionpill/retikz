/** Chart Source 的固定命名空间 */
export const CHART_NAMESPACE = 'chart' as const;

/** 固定 presentation slot 的顺序 */
export const ChartPresentationSlot = {
  Title: 'title',
  Subtitle: 'subtitle',
  Plot: 'plot',
  Note: 'note',
  Source: 'source',
} as const;

/** Chart shell 的声明式 token key */
export const ChartThemeToken = {
  CanvasFill: 'chart.canvas.fill',
  Padding: 'chart.padding',
  Gap: 'chart.gap',
  FontFamily: 'chart.font.family',
  TitleForeground: 'chart.title.foreground',
  TitleFontSize: 'chart.title.font.size',
  TitleFontWeight: 'chart.title.font.weight',
  TitleLineHeight: 'chart.title.lineHeight',
  TitleAlign: 'chart.title.align',
  SubtitleForeground: 'chart.subtitle.foreground',
  SubtitleFontSize: 'chart.subtitle.font.size',
  SubtitleFontWeight: 'chart.subtitle.font.weight',
  SubtitleLineHeight: 'chart.subtitle.lineHeight',
  SubtitleAlign: 'chart.subtitle.align',
  NoteForeground: 'chart.note.foreground',
  NoteFontSize: 'chart.note.font.size',
  NoteFontWeight: 'chart.note.font.weight',
  NoteLineHeight: 'chart.note.lineHeight',
  NoteAlign: 'chart.note.align',
  SourceForeground: 'chart.source.foreground',
  SourceFontSize: 'chart.source.font.size',
  SourceFontWeight: 'chart.source.font.weight',
  SourceLineHeight: 'chart.source.lineHeight',
  SourceAlign: 'chart.source.align',
} as const;
