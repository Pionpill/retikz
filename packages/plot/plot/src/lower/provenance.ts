import type { IRJsonObject, JsonValue } from '@retikz/core';
import type { ExternalRow } from '../ir';

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

/**
 * provenance 下沉上下文：贯穿 expand → mark → guide，承载 plotId / dataReference / 各开关
 * @description provenance 关时不构造此对象（传 undefined），mark / guide 据此决定是否写 id / meta，保默认逐字节等价。
 */
export type ProvenanceContext = {
  /** root.id（在 → 作 `<plotId>.` 前缀来源；缺 → 内部元素匿名、meta 省 plotId） */
  plotId?: string;
  /** 数据集引用名（写进 root / per-datum meta 的 dataReference） */
  dataReference: string;
  /** 每个 datum Node 写 per-datum meta（O(rows) 增量，独立开关） */
  datumProvenance: boolean;
  /** 数据属性名：把该字段值绑成 `<plotId>.datum.<值>` 的 Node.id（缺字段 / 重复值 fail loud） */
  datumIdField?: string;
};

/** 把 series / datum 值收成 JsonValue（标量直用，其余 String() 兜底，保 meta JSON-safe） */
const toJsonValue = (value: unknown): JsonValue => {
  if (value === null || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return value;
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
): IRJsonObject => {
  const meta: IRJsonObject = {
    source: PLOT_SOURCE,
    dataReference: context.dataReference,
    mark: markType,
    markIndex,
    transformedIndex,
  };
  if (sourceIndex !== undefined) meta.sourceIndex = sourceIndex;
  if (series !== undefined) meta.series = toJsonValue(series);
  return meta;
};

/** mark 图层 scope.id：用户给 mark.id → `<plotId>.<markId>`；缺省 → `<plotId>.mark.<markIndex>`（plotId 缺 → undefined） */
export const markLayerId = (plotId: string | undefined, markId: string | undefined, markIndex: number): string | undefined => {
  if (plotId === undefined) return undefined;
  return markId !== undefined ? `${plotId}.${markId}` : `${plotId}.mark.${markIndex}`;
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
