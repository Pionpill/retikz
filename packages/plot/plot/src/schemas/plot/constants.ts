import type { ValueOf } from '@retikz/core';

/** plot 域 namespace（单一固定值，作 Tier 2 路由键的单一真源） */
export const PLOT_NAMESPACE = 'plot';

/**
 * plot namespace 内的 composite 类型关键字（暴露给用户；成员值即 IR 判别串，裸 `'plot'` 同样可用）
 * @description discriminated union 判别字段，成员里写 z.literal(PlotComposite.x)（不用 z.enum）；后续加 axis / legend…
 */
export const PlotComposite = {
  /** 顶层 grammar-of-graphics spec 节点 */
  Plot: 'plot',
} as const;

/** plot composite 类型 */
export type PlotCompositeValue = ValueOf<typeof PlotComposite>;
