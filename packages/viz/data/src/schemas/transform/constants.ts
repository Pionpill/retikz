import type { ValueOf } from '@retikz/core';

/**
 * transform operation kind 关键字。
 * @description 数据变换 operation 的判别字段；schema、provider definition 与 registry 诊断共用这些稳定取值。
 */
export const DataTransform = {
  /** 按字段排序 */
  Sort: 'sort',
  /** 分组汇总：groupBy 字段分组 + 多个 reducer metric → 每组一行（改行数） */
  Summarize: 'summarize',
  /** 分组代表行选择：按 selector 选出原始行（保留原始行字段与 provenance；可改行数） */
  Select: 'select',
  /** 分组统计回填：把 reducer / selector 派生信息写回每个原始行（保行数） */
  Annotate: 'annotate',
} as const;

/** transform operation kind 取值。 */
export type DataTransformValue = ValueOf<typeof DataTransform>;

/** data 排序方向关键字。 */
export const DataSortOrder = {
  Ascending: 'ascending',
  Descending: 'descending',
} as const;

/** data 排序方向取值。 */
export type DataSortOrderValue = ValueOf<typeof DataSortOrder>;

/** 内置统计 reducer operation op 关键字。 */
export const ReducerOperationKind = {
  Count: 'count',
  Sum: 'sum',
  Mean: 'mean',
  Median: 'median',
  Min: 'min',
  Max: 'max',
  Extent: 'extent',
  Quantile: 'quantile',
  QuantileBand: 'quantile-band',
} as const;

/** 内置统计 reducer operation op 取值。 */
export type ReducerOperationKindValue = ValueOf<typeof ReducerOperationKind>;

/** 读取 numeric field 的内置统计 reducer operation op 子集。 */
export const FieldReducerOperationKind = {
  Sum: ReducerOperationKind.Sum,
  Mean: ReducerOperationKind.Mean,
  Median: ReducerOperationKind.Median,
  Min: ReducerOperationKind.Min,
  Max: ReducerOperationKind.Max,
  Extent: ReducerOperationKind.Extent,
} as const;

/** 读取 numeric field 的内置统计 reducer operation op 取值。 */
export type FieldReducerOperationKindValue = ValueOf<typeof FieldReducerOperationKind>;

/** 内置 row selector operation op 关键字。 */
export const SelectorOp = {
  Min: 'min',
  Max: 'max',
  First: 'first',
  Last: 'last',
  Top: 'top',
  Bottom: 'bottom',
  Nth: 'nth',
  OutsideQuantileBand: 'outside-quantile-band',
} as const;

/** 内置 row selector operation op 取值。 */
export type SelectorOpValue = ValueOf<typeof SelectorOp>;

/** 按数值字段取极值的 row selector operation op 子集。 */
export const MinMaxSelectorOp = {
  Min: SelectorOp.Min,
  Max: SelectorOp.Max,
} as const;

/** 按数值字段取极值的 row selector operation op 取值。 */
export type MinMaxSelectorOpValue = ValueOf<typeof MinMaxSelectorOp>;

/** 按现有顺序或显式排序取行的 row selector operation op 子集。 */
export const FirstLastSelectorOp = {
  First: SelectorOp.First,
  Last: SelectorOp.Last,
} as const;

/** 按现有顺序或显式排序取行的 row selector operation op 取值。 */
export type FirstLastSelectorOpValue = ValueOf<typeof FirstLastSelectorOp>;

/** 按排序名次取行的 row selector operation op 子集。 */
export const TopBottomSelectorOp = {
  Top: SelectorOp.Top,
  Bottom: SelectorOp.Bottom,
} as const;

/** 按排序名次取行的 row selector operation op 取值。 */
export type TopBottomSelectorOpValue = ValueOf<typeof TopBottomSelectorOp>;

/** row selector 平局处理策略。 */
export const RowSelectorTie = {
  First: 'first',
  Last: 'last',
  All: 'all',
} as const;

/** row selector 平局处理策略值。 */
export type RowSelectorTieValue = ValueOf<typeof RowSelectorTie>;

/** 内置 transform kind 集合；供 external passthrough 排除内置判别串。 */
export const BUILTIN_TRANSFORM_KINDS = new Set<string>(Object.values(DataTransform));

/** 内置统计 reducer operation op 集合；供 external passthrough 排除内置判别串。 */
export const BUILTIN_REDUCER_OPERATION_KINDS = new Set<string>(Object.values(ReducerOperationKind));

/** 内置 row selector operation op 集合；供 external passthrough 排除内置判别串。 */
export const BUILTIN_SELECTOR_OPS = new Set<string>(Object.values(SelectorOp));

/** 已删除的旧 transform kind：不允许被 external passthrough 静默接住。 */
export const REMOVED_TRANSFORM_KINDS = new Set<string>(['aggregate', 'derive-relation']);

/** transform operation passthrough 需要排除的保留 kind。 */
export const RESERVED_TRANSFORM_KINDS = new Set<string>([...BUILTIN_TRANSFORM_KINDS, ...REMOVED_TRANSFORM_KINDS]);
