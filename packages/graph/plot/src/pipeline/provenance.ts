import type { IRJsonObject, JsonValue } from '@retikz/core';

import type { DatumIdRegistrar, ProvenanceContext } from '../contract/provenance';
import type { ExternalRow } from '../schemas';

import { resolveFieldPath } from '../providers/data';

export type { DatumIdRegistrar, ProvenanceContext } from '../contract/provenance';

/**
 * 行级源序标记：ingest 时给每行打 `row[SOURCE_INDEX]=i`，跨 transform（object spread / sort）存活
 * @description Symbol 键不进 JSON.stringify、不被 resolveFieldPath（字符串路径）看见，stack 的 `{...row}` 会拷贝
 *   可枚举 symbol 属性、sort 仅重排保留行对象，故源序在派生 / 重排后仍可回指（best-effort）。
 */
export const SOURCE_INDEX = Symbol('retikz.plot.sourceIndex');

/** 读一行的源序标记（未打标记 → undefined） */
export const readSourceIndex = (row: ExternalRow): number | undefined => {
  const value: unknown = Reflect.get(row, SOURCE_INDEX);
  return typeof value === 'number' ? value : undefined;
};

/**
 * 组级源序标记（alpha.12）：改行数 transform（bin / summarize）给每个输出行打 `row[SOURCE_INDICES]=[...]`
 * @description 聚合 / 分箱产出的一行代表一组源行，故其 provenance 是「源行索引集合」而非单 sourceIndex。
 *   Symbol 键不进 JSON、不被 resolveFieldPath 看见；仅在源行已 tagSourceIndex（provenance 开）时由 transform 填充。
 */
export const SOURCE_INDICES = Symbol('retikz.plot.sourceIndices');

/** 读一行的组级源序标记（未打标记 → undefined）；bin / summarize 输出行的组级 provenance */
export const readSourceIndices = (row: ExternalRow): Array<number> | undefined => {
  const value: unknown = Reflect.get(row, SOURCE_INDICES);
  return Array.isArray(value) && value.every((v): v is number => typeof v === 'number') ? value : undefined;
};

/** 取一组行的源行索引集合；仅 provenance 开启且源行已 tagSourceIndex 时非空。 */
export const readSourceIndicesOf = (rows: Array<ExternalRow>): Array<number> => {
  const out: Array<number> = [];
  for (const row of rows) {
    const index = readSourceIndex(row);
    if (index !== undefined) out.push(index);
  }
  return out;
};

/**
 * 给改行数 transform 的输出行打组级源序标记。
 * @description 成员行没有 sourceIndex（provenance 未开或生成行）时原样返回；Symbol 键不会进入 JSON IR。
 */
export const withGroupProvenance = (row: ExternalRow, members: Array<ExternalRow>): ExternalRow => {
  const indices = readSourceIndicesOf(members);
  return indices.length > 0 ? { ...row, [SOURCE_INDICES]: indices } : row;
};

/**
 * 给每行打源序标记（仅 provenance 开时调用，避免默认产物/行为变化）
 * @description object spread 拷贝可枚举 symbol 属性，故 transform 管线后标记仍在；resolveFieldPath / JSON 都忽略它。
 */
export const tagSourceIndex = (rows: Array<ExternalRow>): Array<ExternalRow> =>
  rows.map((row, index) => ({ ...row, [SOURCE_INDEX]: index }));

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
