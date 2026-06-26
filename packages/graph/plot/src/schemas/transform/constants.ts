import type { ValueOf } from '@retikz/core';

/**
 * transform 类型关键字（暴露给用户；裸 `'sort'` / `'stack'` 同样可用）
 * @description 数据变换 operation 的判别字段，成员里写 z.literal(PlotTransform.x)；后续加 filter / aggregate / bin…
 */
export const PlotTransform = {
  /** 按字段排序 */
  Sort: 'sort',
  /** 堆叠：每个 x 分组内按系列累加，派生 [y0, y1] */
  Stack: 'stack',
  /** 连续字段分箱：N 行观测 → M 箱，每箱产出 start/end 边界 + 箱内规约值（histogram 底座 / rect 显式区间边来源；改行数） */
  Bin: 'bin',
  /** 分组聚合：groupBy 字段分组 + 规约（sum/mean/count/min/max）→ 每组一行（改行数） */
  Aggregate: 'aggregate',
  /** 组内百分比归一化：同组各行 value / 组总和 → 比例（保行数） */
  Normalize: 'normalize',
  /** 单行派生区间：from 字段 → [start, end]（baseline→value 或两字段；保行数） */
  DeriveInterval: 'derive-interval',
  /** 从数据行动态派生 source-target relation rows */
  DeriveRelation: 'derive-relation',
  /** 位置抖动：可序列化 seed + 确定性 PRNG 加随机偏移（v1 仅连续数值数据空间，保行数） */
  Jitter: 'jitter',
} as const;

/** transform 类型 */
export type PlotTransformValue = ValueOf<typeof PlotTransform>;

/** 内置 transform kind 集：供自定义 transform operation 排除内置判别串。 */
export const BUILTIN_TRANSFORM_KINDS = new Set<string>(Object.values(PlotTransform));
