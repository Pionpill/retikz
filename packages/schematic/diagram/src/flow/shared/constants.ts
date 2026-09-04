/** Flow Diagram Source 的稳定类型判别值 */
export const FLOW_TYPE = 'flow' as const;

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
  /** 以直线路径连接关系端点 */
  Straight: 'straight',
  /** 以轴对齐折线路径连接关系端点 */
  Orthogonal: 'orthogonal',
} as const;
