/** 路径填充规则关键字 */
export const PathFillRule = {
  /** 非零环绕规则：子路径方向决定嵌套区域是否抵消 */
  Nonzero: 'nonzero',
  /** 奇偶规则：每次穿过边界都会切换填充状态，适合孔洞和环形区域 */
  EvenOdd: 'evenodd',
} as const;

/** 路径编译 kind 关键字 */
export const PathKind = {
  /** 标准描边路径 */
  Stroke: 'stroke',
  /** Ribbon 带状路径 */
  Ribbon: 'ribbon',
} as const;
