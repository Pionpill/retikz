/** Chart Source 的固定命名空间 */
export const CHART_NAMESPACE = 'chart' as const;

/** 固定 presentation slot 的顺序 */
export const ChartPresentationSlot = {
  /** 图表主标题，位于副标题和绘图区之前 */
  Title: 'title',
  /** 图表副标题，位于主标题之后、绘图区之前 */
  Subtitle: 'subtitle',
  /** 承载 Plot 内容的绘图区，位于标题区域之后、注释区域之前 */
  Plot: 'plot',
  /** 图表补充说明，位于绘图区之后、来源说明之前 */
  Note: 'note',
  /** 图表来源说明，位于所有其他区域之后 */
  Source: 'source',
} as const;
