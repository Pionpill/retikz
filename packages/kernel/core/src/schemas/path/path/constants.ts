/** 路径填充规则关键字 */
export const PathFillRule = {
  /** 非零环绕规则：子路径方向决定嵌套区域是否抵消 */
  Nonzero: 'nonzero',
  /** 奇偶规则：每次穿过边界都会切换填充状态，适合孔洞和环形区域 */
  EvenOdd: 'evenodd',
} as const;

/** 路径端点线帽关键字 */
export const PathLineCap = {
  /** 平切端点：描边精确停在路径端点，不向外延伸 */
  Butt: 'butt',
  /** 圆形端点：在线段端点额外绘制半圆，视觉上更柔和 */
  Round: 'round',
  /** 方形端点：在线段端点外延伸半个线宽，形成方头 */
  Square: 'square',
} as const;

/** 路径拐角连接关键字 */
export const PathLineJoin = {
  /** 尖角连接：两段描边外边缘延长相交，适合保留锐利转角 */
  Miter: 'miter',
  /** 圆角连接：用圆弧连接两段描边，适合柔和转角 */
  Round: 'round',
  /** 斜切连接：削平尖角，避免锐角处产生过长尖峰 */
  Bevel: 'bevel',
} as const;

/** 路径编译 kind 关键字 */
export const PathKind = {
  /** 标准描边路径 */
  Stroke: 'stroke',
  /** Ribbon 带状路径 */
  Ribbon: 'ribbon',
} as const;
