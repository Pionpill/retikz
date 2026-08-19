import type { ValueOf } from '@retikz/foundation';

/** Chart 首版公开的四类展示预设 */
export const ChartPresentationPreset = {
  Title: 'title',
  Subtitle: 'subtitle',
  Note: 'note',
  Source: 'source',
} as const;

/** Chart 展示预设取值 */
export type ChartPresentationPresetValue = ValueOf<typeof ChartPresentationPreset>;

/** 确定形态的 Chart 展示项固定键 */
export const ChartPresentationItemKey = {
  Plot: 'chart.plot',
  Title: 'chart.presentation.title',
  Subtitle: 'chart.presentation.subtitle',
  Note: 'chart.presentation.note',
  Source: 'chart.presentation.source',
} as const;

/** 预设到确定形态展示项固定键的稳定映射 */
export const CHART_PRESENTATION_ITEM_KEY_BY_PRESET: Readonly<Record<ChartPresentationPresetValue, string>> =
  Object.freeze({
    [ChartPresentationPreset.Title]: ChartPresentationItemKey.Title,
    [ChartPresentationPreset.Subtitle]: ChartPresentationItemKey.Subtitle,
    [ChartPresentationPreset.Note]: ChartPresentationItemKey.Note,
    [ChartPresentationPreset.Source]: ChartPresentationItemKey.Source,
  });
