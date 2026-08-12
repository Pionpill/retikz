import type { IRPlotSpec } from '@retikz/plot';

import type { IRChart } from '../schemas/chart';
import type {
  ChartPresentationAuthoringRecord,
  ChartPresentationShorthand,
  IRChartPresentation,
  IRChartPresentationItem,
} from './types';

import { ChartSchema } from '../schemas/chart';
import {
  CHART_PRESENTATION_ITEM_KEY_BY_PRESET,
  chartPresentationDefaultPosition,
  ChartPresentationItemKey,
  ChartPresentationPosition,
  ChartPresentationPreset,
} from './constants';
import { ChartPresentationAuthoringRecordSchema, ChartPresentationSchema } from './schema';

/** 基础与 typed Chart 共用的 framework-neutral authoring 输入 */
export type ChartAuthoringInput = ChartPresentationShorthand & {
  id?: string;
  chartThemeTokens?: IRChart['chartThemeTokens'];
  plot: IRPlotSpec;
  presentation?: ReadonlyArray<ChartPresentationAuthoringRecord>;
};

/** 将一条 authoring record 规范化为 canonical preset item */
const canonicalItemOf = (record: ChartPresentationAuthoringRecord): IRChartPresentationItem => {
  const { position: _position, ...item } = ChartPresentationAuthoringRecordSchema.parse(record);
  void _position;
  return {
    kind: 'preset',
    key: CHART_PRESENTATION_ITEM_KEY_BY_PRESET[item.preset],
    ...item,
  };
};

/** 规范化 shorthand、显式位置和 authored order */
export const normalizeChartPresentation = (
  input: ChartPresentationShorthand & {
    presentation?: ReadonlyArray<ChartPresentationAuthoringRecord>;
  },
): IRChartPresentation | undefined => {
  const records = input.presentation?.map(record => ChartPresentationAuthoringRecordSchema.parse(record)) ?? [];
  const seen = new Set<string>();
  for (const record of records) {
    if (seen.has(record.preset)) {
      throw new Error(`Chart presentation preset '${record.preset}' may appear at most once.`);
    }
    seen.add(record.preset);
  }

  const explicitTop = records.filter(
    record => (record.position ?? chartPresentationDefaultPosition(record.preset)) === ChartPresentationPosition.Top,
  );
  const explicitBottom = records.filter(
    record => (record.position ?? chartPresentationDefaultPosition(record.preset)) === ChartPresentationPosition.Bottom,
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

  return ChartPresentationSchema.parse({
    children: [
      ...explicitTop.map(canonicalItemOf),
      ...remainingTop.map(canonicalItemOf),
      { kind: 'plot', key: ChartPresentationItemKey.Plot },
      ...explicitBottom.map(canonicalItemOf),
      ...remainingBottom.map(canonicalItemOf),
    ],
  });
};

/** 从完整 PlotSpec 与 presentation authoring 创建 canonical IRChart */
export const createChart = (input: ChartAuthoringInput): IRChart => {
  const { title, subtitle, note, source, presentation, ...chart } = input;
  const normalized = normalizeChartPresentation({ title, subtitle, note, source, presentation });
  return ChartSchema.parse({
    namespace: 'chart',
    type: 'chart',
    ...chart,
    ...(normalized === undefined ? {} : { presentation: normalized }),
  });
};
