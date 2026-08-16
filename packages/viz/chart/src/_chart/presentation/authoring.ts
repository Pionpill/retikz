import type { IRPlot } from '@retikz/plot';

import type {
  ChartPresentationAuthoringRecord,
  ChartPresentationShorthand,
  IRChartPresentation,
  IRChartPresentationItem,
} from '../../_shared/presentation';
import type { IRBaseChart } from '../schemas';

import {
  CHART_PRESENTATION_ITEM_KEY_BY_PRESET,
  chartPresentationDefaultPosition,
  ChartPresentationItemKey,
  ChartPresentationPosition,
  ChartPresentationPreset,
} from '../../_shared/presentation';
import { ChartPresentationAuthoringRecordSchema, ChartPresentationSchema } from '../../_shared/presentation';
import { BaseChartSchema } from '../schemas';

/** 基础 Chart 与具体类型 Chart 共用的不依赖框架的编写输入 */
export type ChartAuthoringInput = ChartPresentationShorthand & {
  id?: string;
  chartThemeTokens?: IRBaseChart['chartThemeTokens'];
  plot: IRPlot;
  presentation?: ReadonlyArray<ChartPresentationAuthoringRecord>;
};

/** 将一条编写记录规范化为确定形态的预设项 */
const canonicalItemOf = (record: ChartPresentationAuthoringRecord): IRChartPresentationItem => {
  const { position: _position, ...item } = ChartPresentationAuthoringRecordSchema.parse(record);
  void _position;
  return {
    kind: 'preset',
    key: CHART_PRESENTATION_ITEM_KEY_BY_PRESET[item.preset],
    ...item,
  };
};

/** 规范化简写、显式位置和编写顺序 */
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

/** 从完整 `IRPlot` 与展示编写输入创建 Base Chart */
export const createChart = (input: ChartAuthoringInput): IRBaseChart => {
  const { title, subtitle, note, source, presentation, ...chart } = input;
  const normalized = normalizeChartPresentation({ title, subtitle, note, source, presentation });
  return BaseChartSchema.parse({
    namespace: 'chart',
    type: 'base',
    ...chart,
    ...(normalized === undefined ? {} : { presentation: normalized }),
  });
};
