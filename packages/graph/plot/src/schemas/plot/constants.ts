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

/** 分面空面板生成策略。 */
export const FacetEmptyPolicy = {
  /** 只生成至少包含一行数据的面板。 */
  Drop: 'drop',
  /** 生成所有 row × column 面板组合。 */
  Show: 'show',
} as const;

/** 分面空面板生成策略取值。 */
export type FacetEmptyPolicyValue = ValueOf<typeof FacetEmptyPolicy>;

/** 分面 scale domain 共享模式。 */
export const FacetScaleSharing = {
  /** 使用所有分面面板的数据训练对应 role 的 scale。 */
  Shared: 'shared',
  /** 使用每个面板自己的局部数据训练对应 role 的 scale。 */
  Independent: 'independent',
} as const;

/** 分面 scale domain 共享模式取值。 */
export type FacetScaleSharingValue = ValueOf<typeof FacetScaleSharing>;

/**
 * scaffold frame 共享模式。
 * @description shared 表示 track scope 共享 scaffold 的 frame / bbox；independent 表示只复用 scaffold registry。
 */
export const ScaffoldFrameMode = {
  /** 共享 scaffold frame / bbox。 */
  Shared: 'shared',
  /** 各 track scope 独立解析自己的 frame。 */
  Independent: 'independent',
} as const;

/** scaffold frame 共享模式取值。 */
export type ScaffoldFrameModeValue = ValueOf<typeof ScaffoldFrameMode>;
