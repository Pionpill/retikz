import type { ValueOf } from '@retikz/foundation';

/**
 * transform operation kind 关键字
 * @description 数据变换 operation 的判别字段；schema、provider definition 与 registry 诊断共用这些稳定取值
 */
export const BuiltinDataTransform = {
  /** 按字段排序 */
  Sort: 'sort',
  /** 分组汇总：groupBy 字段分组 + 多个 reducer metric → 每组一行（改行数） */
  Summarize: 'summarize',
  /** 分组代表行选择：按 selector 选出原始行（保留原始行字段与 provenance；可改行数） */
  Select: 'select',
  /** 分组统计回填：把 reducer / selector 派生信息写回每个原始行（保行数） */
  Annotate: 'annotate',

  /** 堆叠：每个 x 分组内按系列累加，派生 [y0, y1] */
  Stack: 'stack',
  /** 连续字段分箱：N 行观测 → M 箱，每箱产出 start/end 边界 + 箱内规约值 */
  Bin: 'bin',
  /** 组内百分比归一化：同组各行 value / 组总和 → 比例 */
  Normalize: 'normalize',
  /** 单行派生区间：from 字段 → [start, end] */
  DeriveInterval: 'derive-interval',
  /** 从数据行动态派生 source-target relation rows */
  Relate: 'relate',
  /** 位置抖动：可序列化 seed + 确定性 PRNG 加随机偏移 */
  Jitter: 'jitter',
  /** 一维 KDE 密度采样：连续样本 → x/density 采样 rows */
  Density: 'density',
  /** 统计平滑 / 趋势采样：连续 (x,y) 样本 → x/y 预测 rows */
  Smooth: 'smooth',
} as const;

/** data 排序方向关键字 */
export const DataSortOrder = {
  /** 按字段值升序排序 */
  Ascending: 'ascending',
  /** 按字段值降序排序 */
  Descending: 'descending',
} as const;

/** 内置统计 reducer operation kind 关键字 */
export const BuiltinReducerOperationKind = {
  /** 统计组内行数 */
  Count: 'count',
  /** 对数值字段求和 */
  Sum: 'sum',
  /** 对数值字段求算术平均值 */
  Mean: 'mean',
  /** 对数值字段求中位数 */
  Median: 'median',
  /** 对数值字段求最小值 */
  Min: 'min',
  /** 对数值字段求最大值 */
  Max: 'max',
  /** 对数值字段求最小值和最大值区间 */
  Extent: 'extent',
  /** 对数值字段求指定分位数 */
  Quantile: 'quantile',
  /** 对数值字段求分位区间 */
  QuantileBand: 'quantile-band',
} as const;

/** 读取 numeric field 的内置统计 reducer operation kind 子集 */
export const BuiltinFieldReducerOperationKind = {
  /** 对数值字段求和 */
  Sum: BuiltinReducerOperationKind.Sum,
  /** 对数值字段求算术平均值 */
  Mean: BuiltinReducerOperationKind.Mean,
  /** 对数值字段求中位数 */
  Median: BuiltinReducerOperationKind.Median,
  /** 对数值字段求最小值 */
  Min: BuiltinReducerOperationKind.Min,
  /** 对数值字段求最大值 */
  Max: BuiltinReducerOperationKind.Max,
  /** 对数值字段求最小值和最大值区间 */
  Extent: BuiltinReducerOperationKind.Extent,
} as const;

/** 内置 row selector operation kind 关键字 */
export const BuiltinSelectorOperationKind = {
  /** 选择排序字段最小的行 */
  Min: 'min',
  /** 选择排序字段最大的行 */
  Max: 'max',
  /** 选择当前顺序或显式排序后的第一行 */
  First: 'first',
  /** 选择当前顺序或显式排序后的最后一行 */
  Last: 'last',
  /** 选择排序字段最高名次的行 */
  Top: 'top',
  /** 选择排序字段最低名次的行 */
  Bottom: 'bottom',
  /** 选择排序后的第 n 行 */
  Nth: 'nth',
  /** 选择落在分位区间之外的原始行 */
  OutsideQuantileBand: 'outside-quantile-band',
} as const;

/** 按数值字段取极值的 row selector operation kind 子集 */
export const BuiltinMinMaxSelectorOperationKind = {
  /** 选择排序字段最小的行 */
  Min: BuiltinSelectorOperationKind.Min,
  /** 选择排序字段最大的行 */
  Max: BuiltinSelectorOperationKind.Max,
} as const;

/** 按现有顺序或显式排序取行的 row selector operation kind 子集 */
export const BuiltinFirstLastSelectorOperationKind = {
  /** 选择当前顺序或显式排序后的第一行 */
  First: BuiltinSelectorOperationKind.First,
  /** 选择当前顺序或显式排序后的最后一行 */
  Last: BuiltinSelectorOperationKind.Last,
} as const;

/** 按排序名次取行的 row selector operation kind 子集 */
export const BuiltinTopBottomSelectorOperationKind = {
  /** 选择排序字段最高名次的行 */
  Top: BuiltinSelectorOperationKind.Top,
  /** 选择排序字段最低名次的行 */
  Bottom: BuiltinSelectorOperationKind.Bottom,
} as const;

/** row selector 平局处理策略 */
export const RowSelectorTie = {
  /** 平局时只保留第一行 */
  First: 'first',
  /** 平局时只保留最后一行 */
  Last: 'last',
  /** 平局时保留所有命中的行 */
  All: 'all',
} as const;

/** transform operation 保留 kind 集合；供 external 开放配置排除内置判别串 */
export const RESERVED_TRANSFORM_KINDS: ReadonlySet<string> = new Set(Object.values(BuiltinDataTransform));

/** 统计 reducer operation 保留 kind 集合；供 external 开放配置排除内置判别串 */
export const RESERVED_REDUCER_OPERATION_KINDS: ReadonlySet<string> = new Set(
  Object.values(BuiltinReducerOperationKind),
);

/** row selector operation 保留 kind 集合；供 external 开放配置排除内置判别串 */
export const RESERVED_SELECTOR_OPERATION_KINDS: ReadonlySet<string> = new Set(
  Object.values(BuiltinSelectorOperationKind),
);

/** stack baseline offset 策略 */
export const StackOffset = {
  /** 从 0 开始按系列顺序累加各段，生成普通堆叠区间 */
  Zero: 'zero',
  /** 按组总和缩放非负段后从 0 累加，使整组堆叠范围归一到 0..1；有限负值会报错 */
  Normalize: 'normalize',
  /** 从 0 开始分别累加正值与负值，使两类区间向基线两侧延伸 */
  Diverging: 'diverging',
  /** 按系列顺序累加各段，并将整组堆叠范围以 0 为中心放置 */
  Center: 'center',
  /** 不累加各段，使每段都生成从 0 到自身值的重叠区间 */
  Overlap: 'overlap',
} as const;

/** 配对度量操作类型 */
export const PairMeasureOperationKind = {
  /** 计算 target 与 source 的数值差 */
  Difference: 'difference',
} as const;

/** 归一化结果的数值基准 */
export const NormalizeBasis = {
  /** 将非负输入输出为 0..1 范围的比例；有限负值会报错 */
  Fraction: 'fraction',
  /** 将非负输入输出为 0..100 范围的百分比；有限负值会报错 */
  Percent: 'percent',
} as const;

/** jitter 作用轴 */
export const JitterAxis = {
  /** 只扰动 x 字段 */
  X: 'x',
  /** 只扰动 y 字段 */
  Y: 'y',
  /** 同时扰动 x 与 y 字段 */
  Both: 'both',
} as const;

/** density 带宽策略类型 */
export const DensityBandwidthKind = {
  /** 使用 Silverman 经验规则计算带宽 */
  Silverman: 'silverman',
  /** 使用显式数值带宽 */
  Value: 'value',
} as const;

/** transform operation kind 取值 */
export type BuiltinDataTransform = ValueOf<typeof BuiltinDataTransform>;

/** data 排序方向取值 */
export type DataSortOrder = ValueOf<typeof DataSortOrder>;

/** 内置统计 reducer operation kind 取值 */
export type BuiltinReducerOperationKind = ValueOf<typeof BuiltinReducerOperationKind>;

/** 读取 numeric field 的内置统计 reducer operation kind 取值 */
export type BuiltinFieldReducerOperationKind = ValueOf<typeof BuiltinFieldReducerOperationKind>;

/** 内置 row selector operation kind 取值 */
export type BuiltinSelectorOperationKind = ValueOf<typeof BuiltinSelectorOperationKind>;

/** 按数值字段取极值的 row selector operation kind 取值 */
export type BuiltinMinMaxSelectorOperationKind = ValueOf<typeof BuiltinMinMaxSelectorOperationKind>;

/** 按现有顺序或显式排序取行的 row selector operation kind 取值 */
export type BuiltinFirstLastSelectorOperationKind = ValueOf<typeof BuiltinFirstLastSelectorOperationKind>;

/** 按排序名次取行的 row selector operation kind 取值 */
export type BuiltinTopBottomSelectorOperationKind = ValueOf<typeof BuiltinTopBottomSelectorOperationKind>;

/** row selector 平局处理策略值 */
export type RowSelectorTie = ValueOf<typeof RowSelectorTie>;

/** stack baseline offset 策略值 */
export type StackOffset = ValueOf<typeof StackOffset>;

/** 配对度量操作类型取值 */
export type PairMeasureOperationKind = ValueOf<typeof PairMeasureOperationKind>;

/** 归一化结果的数值基准取值 */
export type NormalizeBasis = ValueOf<typeof NormalizeBasis>;

/** jitter 作用轴取值 */
export type JitterAxis = ValueOf<typeof JitterAxis>;

/** density 带宽策略类型取值 */
export type DensityBandwidthKind = ValueOf<typeof DensityBandwidthKind>;
