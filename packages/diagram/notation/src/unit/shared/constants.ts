/** Notation 复合元素的命名空间 */
export const NOTATION_NAMESPACE = 'notation' as const;

/** 具有局部布局或路由能力的 Notation 复合元素判别值 */
export const LogicCompositeType = {
  LogicFrame: 'logicFrame',
  Connector: 'connector',
  Callout: 'callout',
} as const;

/** Connector 角色词汇 */
export const ConnectorRole = {
  Flow: 'flow',
  Branch: 'branch',
  Dependency: 'dependency',
  Feedback: 'feedback',
} as const;

/** Connector 路由变体 */
export const ConnectorRouteKind = {
  Straight: 'straight',
  Polyline: 'polyline',
  Orthogonal: 'orthogonal',
  Quadratic: 'quadratic',
  Cubic: 'cubic',
  Bend: 'bend',
} as const;

/** 正交路由方向模式 */
export const ConnectorOrthogonalPattern = {
  HorizontalVertical: 'hv',
  VerticalHorizontal: 'vh',
  HorizontalVerticalHorizontal: 'hvh',
  VerticalHorizontalVertical: 'vhv',
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
