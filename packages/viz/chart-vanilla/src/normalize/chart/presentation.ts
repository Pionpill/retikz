import type { IRChartPresentation, IRChartPresentationRegion } from '@retikz/chart';

import type { InputChartPresentation, InputChartPresentationRegion } from './types';

/** 把 Vanilla presentation shorthand 归一为固定四槽位正式区域 */
const presentationRegionOf = (input: InputChartPresentationRegion): IRChartPresentationRegion =>
  typeof input === 'string' || Array.isArray(input) ? { text: input } : input;

/** 把 Vanilla presentation shorthand 归一为固定四槽位
 *
 * Plot 不写入 Source presentation；Chart resolver 在消费时负责插入固定 Plot 槽位
 */
export const normalizeChartPresentation = (
  input: InputChartPresentation,
  existing: IRChartPresentation | undefined = undefined,
): IRChartPresentation | undefined => {
  const presentation: IRChartPresentation = {
    ...(existing?.title === undefined ? {} : { title: existing.title }),
    ...(existing?.subtitle === undefined ? {} : { subtitle: existing.subtitle }),
    ...(existing?.note === undefined ? {} : { note: existing.note }),
    ...(existing?.source === undefined ? {} : { source: existing.source }),
    ...(input.title === undefined ? {} : { title: presentationRegionOf(input.title) }),
    ...(input.subtitle === undefined ? {} : { subtitle: presentationRegionOf(input.subtitle) }),
    ...(input.note === undefined ? {} : { note: presentationRegionOf(input.note) }),
    ...(input.source === undefined ? {} : { source: presentationRegionOf(input.source) }),
  };
  return Object.keys(presentation).length === 0 ? undefined : presentation;
};
