import type { ValueOf } from '@retikz/core';

/**
 * plot-only transform 类型关键字。
 * @description 这些 transform 直接服务 plot mark / geometry / stat layer，由 plot 自行注册到 data transform pipeline。
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

/** plot-only transform 类型。 */
export type PlotTransformValue = ValueOf<typeof PlotTransform>;

/** stack baseline offset 策略。 */
export const StackOffset = {
  Zero: 'zero',
  Normalize: 'normalize',
  Diverging: 'diverging',
  Center: 'center',
  Overlap: 'overlap',
} as const;

/** stack baseline offset 策略值。 */
export type StackOffsetValue = ValueOf<typeof StackOffset>;

/** plot 内置 transform kind 集：用于外部 transform passthrough 排除 plot 内置判别串。 */
export const BUILTIN_PLOT_TRANSFORM_KINDS = new Set<string>(Object.values(PlotTransform));
