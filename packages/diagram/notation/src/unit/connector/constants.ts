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
  /** 向左侧弯曲 */
  Left: 'left',
  /** 向右侧弯曲 */
  Right: 'right',
} as const;
