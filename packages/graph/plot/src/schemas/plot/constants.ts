import type { ValueOf } from '@retikz/core';

/** plot 域 namespace（单一固定值，作 Tier 2 路由键的单一真源） */
export const PLOT_NAMESPACE = 'plot';

/**
 * plot namespace 内的 composite 类型关键字（暴露给用户；成员值即 IR 判别串，裸 `'plot'` 同样可用）
 * @description discriminated union 判别字段，成员里写 z.literal(PlotComposite.x)（不用 z.enum）。
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

/** 多 scope composition 下的 axis 输出策略。 */
export const CompositionAxisPolicy = {
  /** 每个 coordinate scope 独立输出自己的 axis。 */
  PerScope: 'perScope',
  /** 对共享 scale 的 facet / track 只输出外侧共享 axis。 */
  OuterShared: 'outerShared',
} as const;

/** 多 scope composition 下的 axis 输出策略取值。 */
export type CompositionAxisPolicyValue = ValueOf<typeof CompositionAxisPolicy>;

/** 多 scope composition 下 axis grid 的默认投放策略。 */
export const CompositionGridPlacement = {
  /** 投放到 axis 自己绑定的 coordinate scope。 */
  Self: 'self',
  /** 投放到与 axis 共享 coordinate role / scale identity 的 scope。 */
  SharedRole: 'sharedRole',
} as const;

/** 多 scope composition 下 axis grid 默认投放策略取值。 */
export type CompositionGridPlacementValue = ValueOf<typeof CompositionGridPlacement>;

/** facet panel label 输出策略。 */
export const CompositionFacetLabelPolicy = {
  /** 不输出 facet label。 */
  None: 'none',
  /** 输出 row / column facet value label。 */
  RowColumn: 'rowColumn',
} as const;

/** facet panel label 输出策略取值。 */
export type CompositionFacetLabelPolicyValue = ValueOf<typeof CompositionFacetLabelPolicy>;

/** shared scaffold track label 输出策略。 */
export const CompositionTrackLabelPolicy = {
  /** 不输出 track label。 */
  None: 'none',
  /** 在 track 内输出 inline label。 */
  Inline: 'inline',
} as const;

/** shared scaffold track label 输出策略取值。 */
export type CompositionTrackLabelPolicyValue = ValueOf<typeof CompositionTrackLabelPolicy>;
