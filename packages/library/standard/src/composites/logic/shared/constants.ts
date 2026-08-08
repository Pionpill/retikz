/** Standard 逻辑复合组件的固定判别值 */
export const LogicCompositeType = {
  /** 无头部的垂直逻辑块 */
  LogicFrame: 'logicFrame',
  /** 流程起始或结束单元 */
  Terminal: 'terminal',
  /** 流程步骤单元 */
  Stage: 'stage',
  /** 条件判断单元 */
  Decision: 'decision',
  /** 分叉或汇合单元 */
  Junction: 'junction',
  /** 局部关系连接线 */
  Connector: 'connector',
  /** 显式定位说明 */
  Callout: 'callout',
} as const;

/** Terminal 允许的闭合角色 */
export const TerminalRole = {
  /** 流程起始 */
  Start: 'start',
  /** 流程结束 */
  End: 'end',
} as const;

/** Connector 的开放角色词汇 */
export const ConnectorRole = {
  /** 常规流程连接 */
  Flow: 'flow',
  /** 分支连接 */
  Branch: 'branch',
  /** 依赖连接 */
  Dependency: 'dependency',
  /** 反馈连接 */
  Feedback: 'feedback',
} as const;

/** Junction 的开放角色词汇 */
export const JunctionRole = {
  /** 分叉节点 */
  Fork: 'fork',
  /** 合并节点 */
  Merge: 'merge',
  /** 汇合节点 */
  Join: 'join',
  /** 延续节点 */
  Continuation: 'continuation',
} as const;

/** Connector 的路径路由变体 */
export const ConnectorRouteKind = {
  /** 端点之间的直线 */
  Straight: 'straight',
  /** 经过显式折点的折线 */
  Polyline: 'polyline',
  /** 正交折线 */
  Orthogonal: 'orthogonal',
  /** 二次曲线 */
  Quadratic: 'quadratic',
  /** 三次曲线 */
  Cubic: 'cubic',
  /** Core 弯曲路径 */
  Bend: 'bend',
} as const;

/** Connector 正交折线的方向模式 */
export const ConnectorOrthogonalPattern = {
  /** 先水平后垂直 */
  HorizontalVertical: 'hv',
  /** 先垂直后水平 */
  VerticalHorizontal: 'vh',
  /** 水平、垂直、再水平 */
  HorizontalVerticalHorizontal: 'hvh',
  /** 垂直、水平、再垂直 */
  VerticalHorizontalVertical: 'vhv',
} as const;

/** bend 路由的弯曲方向 */
export const ConnectorBendDirection = {
  /** 向左弯曲 */
  Left: 'left',
  /** 向右弯曲 */
  Right: 'right',
} as const;

/** Callout 的四个放置方向 */
export const CalloutSide = {
  /** 放在目标上方 */
  Top: 'top',
  /** 放在目标右侧 */
  Right: 'right',
  /** 放在目标下方 */
  Bottom: 'bottom',
  /** 放在目标左侧 */
  Left: 'left',
} as const;
