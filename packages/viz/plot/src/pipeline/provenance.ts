import type { IRJsonObject, JsonValue } from '@retikz/core';
import type { ExternalRow } from '@retikz/data';

import { resolveFieldPath } from '@retikz/data';

import type { DatumIdRegistrar, ProvenanceContext } from '../contract/provenance';

export type { DatumIdRegistrar, ProvenanceContext } from '../contract/provenance';

/**
 * 把任意值转成 id 路径段：String() 后把 '.' 换成 '_'（'.' 是 plot-local 命名分隔符，会产生路径歧义）
 * @description 非串走 String()；冲突检测由调用方负责（两个不同原值 slug 撞同串 → fail loud）。
 */
export const slug = (value: unknown): string => String(value).replace(/\./g, '_');

/** plot 来源 meta 的公共前缀字段 */
const PLOT_SOURCE = 'plot';

/** 把 series / datum 值收成 JsonValue（标量直用，其余 String() 兜底，保 meta JSON-safe） */
const toJsonValue = (value: unknown): JsonValue => {
  if (value === null || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean')
    return value;
  return String(value);
};

/** mark 层来源 meta（写在每 mark 的图层 Scope） */
export const markLayerMeta = (markType: string, markIndex: number): IRJsonObject => ({
  source: PLOT_SOURCE,
  layer: 'mark',
  mark: markType,
  markIndex,
});

/** guide 层来源 meta（写在轴 / 网格 Scope） */
export const guideLayerMeta = (layer: 'axis' | 'grid', dimension: string): IRJsonObject => ({
  source: PLOT_SOURCE,
  layer,
  dimension,
});

/** root 来源 meta（写在外层 plot Scope） */
export const rootMeta = (dataReference: string): IRJsonObject => ({
  source: PLOT_SOURCE,
  dataReference,
});

/** series Path 来源 meta（line / area，写在每条 series Path） */
export const seriesPathMeta = (markType: string, markIndex: number, series: unknown): IRJsonObject => ({
  source: PLOT_SOURCE,
  layer: 'mark',
  mark: markType,
  markIndex,
  series: toJsonValue(series),
});

/** per-datum 来源 meta（写在 point / interval / sector 的每个 datum Node） */
export const datumMeta = (
  context: ProvenanceContext,
  markType: string,
  markIndex: number,
  transformedIndex: number,
  sourceIndex: number | undefined,
  series: unknown,
  sourceIndices?: Array<number>,
): IRJsonObject => {
  const meta: IRJsonObject = {
    source: PLOT_SOURCE,
    dataReference: context.dataReference,
    mark: markType,
    markIndex,
    transformedIndex,
  };
  // 改行数 transform（bin / summarize）产出的 datum 代表一组源行 → 组级 sourceIndices（数组）；否则单 sourceIndex
  if (sourceIndices !== undefined && sourceIndices.length > 0) meta.sourceIndices = [...sourceIndices];
  else if (sourceIndex !== undefined) meta.sourceIndex = sourceIndex;
  if (series !== undefined) meta.series = toJsonValue(series);
  return meta;
};

/** mark 图层 scope.id：用户给 mark.id → `<plotId>.<markId>`；缺省 → `<plotId>.mark.<markIndex>`（plotId 缺 → undefined） */
export const markLayerId = (
  plotId: string | undefined,
  markId: string | undefined,
  markIndex: number,
): string | undefined => {
  if (plotId === undefined) return undefined;
  return markId !== undefined ? `${plotId}.${markId}` : `${plotId}.mark.${markIndex}`;
};

/**
 * 建一个 plot 级 datum id 登记器（datumIdField + plotId 在时由调用方构造一次、线穿全 mark）
 * @description seen 在闭包内跨 mark 累积——任意两个 node（含跨 mark）撞同 id 即 fail loud。
 */
export const createDatumIdRegistrar = (datumIdField: string, plotId: string): DatumIdRegistrar => {
  const seenIds = new Map<string, unknown>();
  return (row: ExternalRow): string => {
    const raw = resolveFieldPath(row, datumIdField);
    if (raw === undefined) {
      throw new Error(
        `lowerPlots: datumIdField "${datumIdField}" missing on a row; every row must carry the id field (cannot synthesize a stable anchor)`,
      );
    }
    const id = `${plotId}.datum.${slug(raw)}`;
    const prior = seenIds.get(id);
    if (prior !== undefined && prior !== raw) {
      throw new Error(
        `lowerPlots: datumIdField "${datumIdField}" values "${String(prior)}" and "${String(raw)}" collide to the same datum id "${id}"; anchors must be unique`,
      );
    }
    if (seenIds.has(id)) {
      throw new Error(
        `lowerPlots: duplicate datumIdField "${datumIdField}" value "${String(raw)}" → duplicate datum id "${id}"; anchors must be unique`,
      );
    }
    seenIds.set(id, raw);
    return id;
  };
};

/** guide scope.id：用户给 guide.id → `<plotId>.<guideId>`；缺省 → `<plotId>.<axis|grid>.<dimension>`（plotId 缺 → undefined） */
export const guideLayerId = (
  plotId: string | undefined,
  guideId: string | undefined,
  layer: 'axis' | 'grid',
  dimension: string,
): string | undefined => {
  if (plotId === undefined) return undefined;
  return guideId !== undefined ? `${plotId}.${guideId}` : `${plotId}.${layer}.${dimension}`;
};
