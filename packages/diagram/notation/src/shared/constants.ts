/** Notation 复合元素的命名空间 */
export const NOTATION_NAMESPACE = 'notation' as const;

/** 具有局部布局或路由能力的 Notation 复合元素判别值 */
export const LogicCompositeType = {
  /** 包含分区内容的逻辑框架 */
  LogicFrame: 'logicFrame',
  /** 表示图式元素间关系的连接线 */
  Connector: 'connector',
  /** 依附目标的说明标注 */
  Callout: 'callout',
} as const;

/** Connector 角色词汇 */
export const ConnectorRole = {
  /** 流程顺序关系 */
  Flow: 'flow',
  /** 分支关系 */
  Branch: 'branch',
  /** 依赖关系 */
  Dependency: 'dependency',
  /** 反馈关系 */
  Feedback: 'feedback',
} as const;

/** Connector 路由变体 */
export const ConnectorRouteKind = {
  /** 直线路由 */
  Straight: 'straight',
  /** 显式折线路由 */
  Polyline: 'polyline',
  /** 正交路由 */
  Orthogonal: 'orthogonal',
  /** 二次贝塞尔曲线路由 */
  Quadratic: 'quadratic',
  /** 三次贝塞尔曲线路由 */
  Cubic: 'cubic',
  /** 基于方向或切向的弯曲路由 */
  Bend: 'bend',
} as const;

/** 弯曲路由的侧向 */
export const ConnectorBendDirection = {
  Left: 'left',
  Right: 'right',
} as const;

/** Callout 放置方向 */
export const CalloutSide = {
  Top: 'top',
  Right: 'right',
  Bottom: 'bottom',
  Left: 'left',
} as const;
