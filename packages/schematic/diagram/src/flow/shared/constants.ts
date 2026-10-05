import type { ValueOf } from '@retikz/foundation';

/** Flow Diagram Source 的稳定类型判别值 */
export const FLOW_TYPE = 'flow' as const;

/** Flow Layout 固定排列的种类 */
export const FlowPlacementKind = {
  /** 一维顺序排列 */
  Linear: 'linear',
  /** 共享行列中心的二维排列 */
  Grid: 'grid',
} as const;

/** Flow 自动布局作用域与 Layout 固定排列的主方向 */
export const FlowDirection = {
  /** 当前布局作用域的主方向向上 */
  Up: 'up',
  /** 当前布局作用域的主方向向右 */
  Right: 'right',
  /** 当前布局作用域的主方向向下 */
  Down: 'down',
  /** 当前布局作用域的主方向向左 */
  Left: 'left',
} as const;

/** Flow Layout children 的交叉轴对齐方式 */
export const FlowLayoutAlignment = {
  /** children 对齐到交叉轴起点 */
  Start: 'start',
  /** children 在交叉轴居中 */
  Center: 'center',
  /** children 对齐到交叉轴终点 */
  End: 'end',
} as const;

/** Flow relation 的路由意图 */
export const FlowRoutingKind = {
  /** 按作者指定的中间点生成样条，不自动搜索经过点 */
  Smooth: 'smooth',
  /** 二次贝塞尔，省略控制点时自动求解 */
  Curve: 'curve',
  /** 三次贝塞尔，省略两个控制点时自动求解 */
  Cubic: 'cubic',
  /** 复用 Core bend 的常规曲线 */
  Bend: 'bend',
  /** 以直线路径连接关系端点 */
  Straight: 'straight',
  /** 以轴对齐折线路径连接关系端点 */
  Orthogonal: 'orthogonal',
  /** 从 source 到 target 先水平后垂直 */
  HorizontalThenVertical: '-|',
  /** 从 source 到 target 先垂直后水平 */
  VerticalThenHorizontal: '|-',
} as const;

/** 同侧连接落点的分配策略 */
export const FlowEndpointOverlap = { Allow: 'allow', Separate: 'separate' } as const;

/** Flow Layout 固定排列种类值 */
export type FlowPlacementKind = ValueOf<typeof FlowPlacementKind>;

/** Flow 自动布局作用域与 Layout 固定排列的主方向值 */
export type FlowDirection = ValueOf<typeof FlowDirection>;

/** Flow Layout 交叉轴对齐值 */
export type FlowLayoutAlignment = ValueOf<typeof FlowLayoutAlignment>;

/** Flow relation 路由值 */
export type FlowRoutingKind = ValueOf<typeof FlowRoutingKind>;
