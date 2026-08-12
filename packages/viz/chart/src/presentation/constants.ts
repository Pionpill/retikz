import type { ValueOf } from '@retikz/foundation';

/** Chart 首版公开的四类 presentation preset */
export const ChartPresentationPreset = {
  Title: 'title',
  Subtitle: 'subtitle',
  Note: 'note',
  Source: 'source',
} as const;

/** Chart presentation preset 取值 */
export type ChartPresentationPresetValue = ValueOf<typeof ChartPresentationPreset>;

/** React / Vanilla authoring 阶段的 presentation 位置 */
export const ChartPresentationPosition = {
  Top: 'top',
  Bottom: 'bottom',
} as const;

/** typed Chart adapter 使用的稳定默认外部数据引用 */
export const DEFAULT_CHART_DATA_REFERENCE = 'chart.data';

/** Chart presentation authoring 位置取值 */
export type ChartPresentationPositionValue = ValueOf<typeof ChartPresentationPosition>;

/** canonical Chart presentation item 的固定 key */
export const ChartPresentationItemKey = {
  Plot: 'chart.plot',
  Title: 'chart.presentation.title',
  Subtitle: 'chart.presentation.subtitle',
  Note: 'chart.presentation.note',
  Source: 'chart.presentation.source',
} as const;

/** preset 到 canonical item key 的稳定映射 */
export const CHART_PRESENTATION_ITEM_KEY_BY_PRESET: Readonly<Record<ChartPresentationPresetValue, string>> =
  Object.freeze({
    [ChartPresentationPreset.Title]: ChartPresentationItemKey.Title,
    [ChartPresentationPreset.Subtitle]: ChartPresentationItemKey.Subtitle,
    [ChartPresentationPreset.Note]: ChartPresentationItemKey.Note,
    [ChartPresentationPreset.Source]: ChartPresentationItemKey.Source,
  });

/** preset shorthand 的固定默认顺序 */
export const CHART_PRESENTATION_PRESET_ORDER = [
  ChartPresentationPreset.Title,
  ChartPresentationPreset.Subtitle,
  ChartPresentationPreset.Note,
  ChartPresentationPreset.Source,
] as const;

/** 读取 preset 的默认 authoring 位置 */
export const chartPresentationDefaultPosition = (
  preset: ChartPresentationPresetValue,
): ChartPresentationPositionValue =>
  preset === ChartPresentationPreset.Title || preset === ChartPresentationPreset.Subtitle
    ? ChartPresentationPosition.Top
    : ChartPresentationPosition.Bottom;
