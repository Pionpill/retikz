import type { IRJsonObject, JsonValue } from '@retikz/core';
import type { ExternalRow } from '@retikz/data';

/**
 * provenance 下沉上下文：贯穿 expand -> mark -> guide，承载 plotId / dataReference / 各开关。
 * @description provenance 关时不构造此对象（传 undefined），mark / guide 据此决定是否写 id / meta
 */
export type ProvenanceContext = {
  /** root.id；存在时作为 plot-local id 前缀，缺省则内部元素匿名 */
  plotId?: string;
  /** 数据集引用名，写入 root / per-datum meta */
  dataReference: string;
  /** 是否给每个 datum node 写 per-datum meta */
  datumProvenance: boolean;
  /** 数据属性名：把该字段值绑定成 `<plotId>.datum.<value>` 的 Node.id */
  datumIdField?: string;
};

/** datum id 登记器：行 -> `<plotId>.datum.<slug>`，由 expand 构造一次并跨 mark 共享 */
export type DatumIdRegistrar = (row: ExternalRow) => string;

/**
 * 单个 mark 下沉时的 provenance 上下文。
 * @description contract 层定义该形状，provider 只消费它，避免 contract 反向依赖 provider 实现
 */
export type MarkProvenance = {
  /** plot 级 provenance 上下文 */
  context: ProvenanceContext;
  /** 当前 mark 在 spec.marks 的序号 */
  markIndex: number;
  /** plot 级 datum id 登记器；无 datumIdField 或无 plotId 时省略 */
  registerDatumId?: DatumIdRegistrar;
};

/**
 * 把任意值转成 id 路径段。
 * @description 非字符串走 String()；点号会与 plot-local 命名层级冲突，因此替换为下划线
 */
export const slug = (value: unknown): string => String(value).replace(/\./g, '_');

/** plot 来源 meta 的公共前缀字段 */
const PLOT_SOURCE = 'plot';

/** 把 series / datum 值收成 JSON-safe meta 标量 */
const toJsonValue = (value: unknown): JsonValue => {
  if (value === null || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean')
    return value;
  return String(value);
};

/** mark 图层来源 meta，写在每个 mark 的图层 Scope */
export const markLayerMeta = (markType: string, markIndex: number): IRJsonObject => ({
  source: PLOT_SOURCE,
  layer: 'mark',
  mark: markType,
  markIndex,
});

/** guide 图层来源 meta，写在轴 / 网格 Scope */
export const guideLayerMeta = (layer: 'axis' | 'grid', dimension: string): IRJsonObject => ({
  source: PLOT_SOURCE,
  layer,
  dimension,
});

/** root 来源 meta，写在外层 plot Scope */
export const rootMeta = (dataReference: string): IRJsonObject => ({
  source: PLOT_SOURCE,
  dataReference,
});

/** series Path 来源 meta，写在每条 series Path */
export const seriesPathMeta = (markType: string, markIndex: number, series: unknown): IRJsonObject => ({
  source: PLOT_SOURCE,
  layer: 'mark',
  mark: markType,
  markIndex,
  series: toJsonValue(series),
});

/** per-datum 来源 meta，写在 point / interval / sector 的每个 datum Node */
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
  if (sourceIndices !== undefined && sourceIndices.length > 0) meta.sourceIndices = [...sourceIndices];
  else if (sourceIndex !== undefined) meta.sourceIndex = sourceIndex;
  if (series !== undefined) meta.series = toJsonValue(series);
  return meta;
};

/** mark 图层 scope.id，存在 plotId 时生成 plot-local 稳定 id */
export const markLayerId = (
  plotId: string | undefined,
  markId: string | undefined,
  markIndex: number,
): string | undefined => {
  if (plotId === undefined) return undefined;
  return markId !== undefined ? `${plotId}.${markId}` : `${plotId}.mark.${markIndex}`;
};

/** guide scope.id，存在 plotId 时按 guide owner 与 paint phase 生成 plot-local 稳定 id */
export const guideLayerId = (
  plotId: string | undefined,
  guideId: string | undefined,
  layer: 'axis' | 'grid',
  dimension: string,
  coordinateView?: string,
): string | undefined => {
  if (plotId === undefined) return undefined;
  if (guideId !== undefined) return layer === 'axis' ? `${plotId}.${guideId}` : `${plotId}.${guideId}.grid`;
  if (coordinateView !== undefined) {
    return `${plotId}.view.${slug(coordinateView)}.${layer}.${dimension}`;
  }
  return `${plotId}.${layer}.${dimension}`;
};
