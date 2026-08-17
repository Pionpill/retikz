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

/** React / Vanilla 编写阶段的展示位置 */
export const ChartPresentationPosition = {
  Top: 'top',
  Bottom: 'bottom',
} as const;

/** 具体类型 Chart 适配器使用的稳定默认外部数据引用 */
export const DEFAULT_CHART_DATA_REFERENCE = 'chart.data';

/** Chart 展示编写位置取值 */
export type ChartPresentationPositionValue = ValueOf<typeof ChartPresentationPosition>;

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

/** 预设简写的固定默认顺序 */
export const CHART_PRESENTATION_PRESET_ORDER = [
  ChartPresentationPreset.Title,
  ChartPresentationPreset.Subtitle,
  ChartPresentationPreset.Note,
  ChartPresentationPreset.Source,
] as const;

/** 读取预设的默认编写位置 */
export const chartPresentationDefaultPosition = (
  preset: ChartPresentationPresetValue,
): ChartPresentationPositionValue =>
  preset === ChartPresentationPreset.Title || preset === ChartPresentationPreset.Subtitle
    ? ChartPresentationPosition.Top
    : ChartPresentationPosition.Bottom;
