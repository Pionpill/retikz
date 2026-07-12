import { createReadonlySet } from '../../shared';

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

/** data 排序方向关键字。 */
export const DataSortOrder = {
  /** 按字段值升序排序。 */
  Ascending: 'ascending',
  /** 按字段值降序排序。 */
  Descending: 'descending',
} as const;

/** 内置统计 reducer operation kind 关键字。 */
export const ReducerOperationKind = {
  /** 统计组内行数。 */
  Count: 'count',
  /** 对数值字段求和。 */
  Sum: 'sum',
  /** 对数值字段求算术平均值。 */
  Mean: 'mean',
  /** 对数值字段求中位数。 */
  Median: 'median',
  /** 对数值字段求最小值。 */
  Min: 'min',
  /** 对数值字段求最大值。 */
  Max: 'max',
  /** 对数值字段求最小值和最大值区间。 */
  Extent: 'extent',
  /** 对数值字段求指定分位数。 */
  Quantile: 'quantile',
  /** 对数值字段求分位区间。 */
  QuantileBand: 'quantile-band',
} as const;

/** 读取 numeric field 的内置统计 reducer operation kind 子集。 */
export const FieldReducerOperationKind = {
  /** 对数值字段求和。 */
  Sum: ReducerOperationKind.Sum,
  /** 对数值字段求算术平均值。 */
  Mean: ReducerOperationKind.Mean,
  /** 对数值字段求中位数。 */
  Median: ReducerOperationKind.Median,
  /** 对数值字段求最小值。 */
  Min: ReducerOperationKind.Min,
  /** 对数值字段求最大值。 */
  Max: ReducerOperationKind.Max,
  /** 对数值字段求最小值和最大值区间。 */
  Extent: ReducerOperationKind.Extent,
} as const;

/** 内置 row selector operation kind 关键字。 */
export const SelectorOperationKind = {
  /** 选择排序字段最小的行。 */
  Min: 'min',
  /** 选择排序字段最大的行。 */
  Max: 'max',
  /** 选择当前顺序或显式排序后的第一行。 */
  First: 'first',
  /** 选择当前顺序或显式排序后的最后一行。 */
  Last: 'last',
  /** 选择排序字段最高名次的行。 */
  Top: 'top',
  /** 选择排序字段最低名次的行。 */
  Bottom: 'bottom',
  /** 选择排序后的第 n 行。 */
  Nth: 'nth',
  /** 选择落在分位区间之外的原始行。 */
  OutsideQuantileBand: 'outside-quantile-band',
} as const;

/** 按数值字段取极值的 row selector operation kind 子集。 */
export const MinMaxSelectorOperationKind = {
  /** 选择排序字段最小的行。 */
  Min: SelectorOperationKind.Min,
  /** 选择排序字段最大的行。 */
  Max: SelectorOperationKind.Max,
} as const;

/** 按现有顺序或显式排序取行的 row selector operation kind 子集。 */
export const FirstLastSelectorOperationKind = {
  /** 选择当前顺序或显式排序后的第一行。 */
  First: SelectorOperationKind.First,
  /** 选择当前顺序或显式排序后的最后一行。 */
  Last: SelectorOperationKind.Last,
} as const;

/** 按排序名次取行的 row selector operation kind 子集。 */
export const TopBottomSelectorOperationKind = {
  /** 选择排序字段最高名次的行。 */
  Top: SelectorOperationKind.Top,
  /** 选择排序字段最低名次的行。 */
  Bottom: SelectorOperationKind.Bottom,
} as const;

/** row selector 平局处理策略。 */
export const RowSelectorTie = {
  /** 平局时只保留第一行。 */
  First: 'first',
  /** 平局时只保留最后一行。 */
  Last: 'last',
  /** 平局时保留所有命中的行。 */
  All: 'all',
} as const;

/** transform operation 保留 kind 集合；供 external 开放配置排除内置判别串。 */
export const RESERVED_TRANSFORM_KINDS: ReadonlySet<string> = createReadonlySet(Object.values(DataTransform));

/** 统计 reducer operation 保留 kind 集合；供 external 开放配置排除内置判别串。 */
export const RESERVED_REDUCER_OPERATION_KINDS: ReadonlySet<string> = createReadonlySet(
  Object.values(ReducerOperationKind),
);

/** row selector operation 保留 kind 集合；供 external 开放配置排除内置判别串。 */
export const RESERVED_SELECTOR_OPERATION_KINDS: ReadonlySet<string> = createReadonlySet(
  Object.values(SelectorOperationKind),
);
