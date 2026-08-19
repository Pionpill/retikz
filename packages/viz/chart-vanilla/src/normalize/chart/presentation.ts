import type { IRChartPresentation, IRChartPresentationItem } from '@retikz/chart';

import {
  CHART_PRESENTATION_ITEM_KEY_BY_PRESET,
  ChartPresentationItemKey,
  ChartPresentationPreset,
} from '@retikz/chart';

import type { InputChartPresentation, InputChartPresentationRecord } from './types';

import { RetikzChartVanillaError } from '../../error';
import { ChartPresentationPosition } from './constants';

/** 读取 presentation preset 省略位置时的默认分区 */
const defaultPositionOf = (preset: InputChartPresentationRecord['preset']) =>
  preset === ChartPresentationPreset.Title || preset === ChartPresentationPreset.Subtitle
    ? ChartPresentationPosition.Top
    : ChartPresentationPosition.Bottom;

/** 将 plain authoring 记录转换为 canonical preset item */
const presentationItemOf = (record: InputChartPresentationRecord): IRChartPresentationItem => {
  const { position: _position, ...item } = record;
  void _position;
  return {
    kind: 'preset',
    key: CHART_PRESENTATION_ITEM_KEY_BY_PRESET[item.preset],
    ...item,
  } satisfies IRChartPresentationItem;
};

/** 将 Chart presentation shorthand 与 plain records 组装为 canonical presentation */
export const normalizeChartPresentation = (input: InputChartPresentation): IRChartPresentation | undefined => {
  const records = input.presentation ?? [];
  const seen = new Set<string>();
  for (const record of records) {
    if (seen.has(record.preset)) {
      throw new RetikzChartVanillaError(`Chart presentation preset '${record.preset}' may appear at most once`);
    }
    seen.add(record.preset);
  }

  const explicitTop = records.filter(
    record => (record.position ?? defaultPositionOf(record.preset)) === ChartPresentationPosition.Top,
  );
  const explicitBottom = records.filter(
    record => (record.position ?? defaultPositionOf(record.preset)) === ChartPresentationPosition.Bottom,
  );
  const shorthand = {
    [ChartPresentationPreset.Title]: input.title,
    [ChartPresentationPreset.Subtitle]: input.subtitle,
    [ChartPresentationPreset.Note]: input.note,
    [ChartPresentationPreset.Source]: input.source,
  };
  const remainingTop = [ChartPresentationPreset.Title, ChartPresentationPreset.Subtitle].flatMap(preset => {
    const text = shorthand[preset];
    return text === undefined || seen.has(preset) ? [] : [{ preset, text }];
  });
  const remainingBottom = [ChartPresentationPreset.Note, ChartPresentationPreset.Source].flatMap(preset => {
    const text = shorthand[preset];
    return text === undefined || seen.has(preset) ? [] : [{ preset, text }];
  });
  const hasPresentation =
    input.presentation !== undefined || Object.values(shorthand).some(value => value !== undefined);
  if (!hasPresentation) return undefined;

  return {
    children: [
      ...explicitTop.map(presentationItemOf),
      ...remainingTop.map(presentationItemOf),
      { kind: 'plot', key: ChartPresentationItemKey.Plot },
      ...explicitBottom.map(presentationItemOf),
      ...remainingBottom.map(presentationItemOf),
    ],
  };
};
