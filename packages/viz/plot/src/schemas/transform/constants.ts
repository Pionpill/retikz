/**
 * plot-only transform 类型关键字。
 * @description 这些 transform 直接服务 plot mark / geometry / stat layer，由 plot 自行注册到 data transform pipeline
 */
export const PlotTransform = {
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

/** smooth 方法类型 */
export const SmoothMethodKind = {
  /** 普通最小二乘线性回归 */
  Linear: 'linear',
} as const;

/** plot 内置 transform kind 集：用于外部 transform 开放配置排除 plot 内置判别串 */
export const BUILTIN_PLOT_TRANSFORM_KINDS = new Set<string>(Object.values(PlotTransform));
