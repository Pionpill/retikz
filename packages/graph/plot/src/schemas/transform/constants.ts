import type { ValueOf } from '@retikz/core';

/**
 * transform 类型关键字（暴露给用户；裸 `'sort'` / `'stack'` 同样可用）
 * @description 数据变换 operation 的判别字段，成员里写 z.literal(PlotTransform.x)；后续加 filter / window…
 */
export const PlotTransform = {
  /** 按字段排序 */
  Sort: 'sort',
  /** 堆叠：每个 x 分组内按系列累加，派生 [y0, y1] */
  Stack: 'stack',
  /** 连续字段分箱：N 行观测 → M 箱，每箱产出 start/end 边界 + 箱内规约值（histogram 底座 / rect 显式区间边来源；改行数） */
  Bin: 'bin',
  /** 分组汇总：groupBy 字段分组 + 多个 reducer metric → 每组一行（改行数） */
  Summarize: 'summarize',
  /** 分组代表行选择：按 selector 选出原始行（保留原始行字段与 provenance；可改行数） */
  Select: 'select',
  /** 分组统计回填：把 reducer / selector 派生信息写回每个原始行（保行数） */
  Annotate: 'annotate',
  /** 组内百分比归一化：同组各行 value / 组总和 → 比例（保行数） */
  Normalize: 'normalize',
  /** 单行派生区间：from 字段 → [start, end]（baseline→value 或两字段；保行数） */
  DeriveInterval: 'derive-interval',
  /** 从数据行动态派生 source-target relation rows */
  Relate: 'relate',
  /** 位置抖动：可序列化 seed + 确定性 PRNG 加随机偏移（v1 仅连续数值数据空间，保行数） */
  Jitter: 'jitter',
  /** 一维 KDE 密度采样：连续样本 → x/density 采样 rows（改行数） */
  Density: 'density',
  /** 统计平滑 / 趋势采样：连续 (x,y) 样本 → x/y 预测 rows（改行数） */
  Smooth: 'smooth',
} as const;

/** transform 类型 */
export type PlotTransformValue = ValueOf<typeof PlotTransform>;

/** 内置 transform kind 集：供自定义 transform operation 排除内置判别串。 */
export const BUILTIN_TRANSFORM_KINDS = new Set<string>(Object.values(PlotTransform));

/** 已删除的旧 transform kind：不允许被 external passthrough 静默接住。 */
export const REMOVED_TRANSFORM_KINDS = new Set<string>(['aggregate', 'derive-relation']);

/** transform operation passthrough 需要排除的保留 kind。 */
export const RESERVED_TRANSFORM_KINDS = new Set<string>([...BUILTIN_TRANSFORM_KINDS, ...REMOVED_TRANSFORM_KINDS]);
