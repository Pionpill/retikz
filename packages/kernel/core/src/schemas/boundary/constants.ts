/** 连接面内置关键字：Self 是编译期保留语义，Circle 由内置 boundary provider 解析 */
export const BoundaryKeyword = {
  /** 连接面 = 节点自身视觉形状（默认） */
  Self: 'shape',
  /** 规则圆连接面；具体包围策略由 builtin boundary params.fit 决定 */
  Circle: 'circle',
} as const;

/** 内置规则连接面的拟合策略 */
export const BoundaryFit = {
  /** 使用视觉 shape 提供的安全连接包络 */
  Tight: 'tight',
  /** 使用视觉 shape 的外接 AABB 安全包围 */
  Bounds: 'bounds',
} as const;
