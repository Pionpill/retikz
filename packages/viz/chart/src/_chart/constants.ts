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
