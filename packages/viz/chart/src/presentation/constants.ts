import type { ValueOf } from '@retikz/foundation';

import type { IRChartPresentationItem } from './types';

/** Chart presentation 提供的闭合文本 preset */
export const ChartPresentationPreset = {
  Title: 'title',
  Subtitle: 'subtitle',
  Caption: 'caption',
  Note: 'note',
  Source: 'source',
  Credit: 'credit',
} as const;

/** Chart presentation 文本 preset 取值 */
export type ChartPresentationPresetValue = ValueOf<typeof ChartPresentationPreset>;

/** Chart presentation item 的内容分类 */
export const ChartPresentationItemContentKind = {
  Plot: 'plot',
  Preset: 'preset',
  Child: 'child',
} as const;

/** Chart presentation item 内容分类取值 */
export type ChartPresentationItemContentKindValue = ValueOf<typeof ChartPresentationItemContentKind>;

/** Chart presentation resolution 的外层内容分类 */
export const ChartPresentationResolvedContentKind = {
  Plot: 'plot',
  FlexLayout: 'flex-layout',
} as const;

/** Chart presentation resolution 外层内容分类取值 */
export type ChartPresentationResolvedContentKindValue = ValueOf<typeof ChartPresentationResolvedContentKind>;

/** Plot 与文本 preset 的 container-local 默认 key */
export const ChartPresentationDefaultItemKey = {
  Plot: 'chart.plot',
  Title: 'chart.presentation.title',
  Subtitle: 'chart.presentation.subtitle',
  Caption: 'chart.presentation.caption',
  Note: 'chart.presentation.note',
  Source: 'chart.presentation.source',
  Credit: 'chart.presentation.credit',
} as const;

/** Chart presentation 默认 item key 取值 */
export type ChartPresentationDefaultItemKeyValue = ValueOf<typeof ChartPresentationDefaultItemKey>;

/** 每个文本 preset 对应的默认 item key */
export const CHART_PRESENTATION_DEFAULT_ITEM_KEY_BY_PRESET: Readonly<
  Record<ChartPresentationPresetValue, ChartPresentationDefaultItemKeyValue>
> = Object.freeze({
  [ChartPresentationPreset.Title]: ChartPresentationDefaultItemKey.Title,
  [ChartPresentationPreset.Subtitle]: ChartPresentationDefaultItemKey.Subtitle,
  [ChartPresentationPreset.Caption]: ChartPresentationDefaultItemKey.Caption,
  [ChartPresentationPreset.Note]: ChartPresentationDefaultItemKey.Note,
  [ChartPresentationPreset.Source]: ChartPresentationDefaultItemKey.Source,
  [ChartPresentationPreset.Credit]: ChartPresentationDefaultItemKey.Credit,
});

/** 裸 Plot inspection 使用的稳定 source path */
export const CHART_PRESENTATION_RESOLVED_PLOT_SOURCE_PATH = '$resolved/plot' as const;

/** 补齐一个 Chart presentation item 的 container-local key */
export const chartPresentationItemKeyOf = (item: IRChartPresentationItem): string => {
  if (item.key !== undefined) return item.key;
  if (item.content.kind === ChartPresentationItemContentKind.Plot) return ChartPresentationDefaultItemKey.Plot;
  return CHART_PRESENTATION_DEFAULT_ITEM_KEY_BY_PRESET[item.content.preset];
};
