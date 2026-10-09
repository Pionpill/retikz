import type { ValueOf } from '@retikz/foundation';

/** 选择从中心线生成轮廓或保留作者提供的两条边界 */
export const RibbonMode = {
  /** 从开放中心线与宽度规则生成带状轮廓 */
  Centerline: 'centerline',
  /** 直接使用作者提供的上下边界 */
  Boundary: 'boundary',
} as const;

/** 按中心线行进方向分配横截面宽度 */
export const RibbonAlignment = {
  /** 宽度平均分配到中心线两侧 */
  Center: 'center',
  /** 全部宽度位于中心线左侧 */
  Left: 'left',
  /** 全部宽度位于中心线右侧 */
  Right: 'right',
} as const;

/** 可通过名称引用的内置带状路径端帽 */
export const BuiltinRibbonCap = {
  /** 按局部圆心、半径和扫掠方向构造圆弧端帽 */
  Arc: 'arc',
  /** 直接连接端面两侧，不沿路径方向延伸 */
  Butt: 'butt',
  /** 以圆弧连接端面两侧 */
  Round: 'round',
  /** 沿端点外向延伸后形成方形端帽 */
  Square: 'square',
} as const;

/** 圆弧端帽在两个端面交点之间采用的扫掠范围 */
export const RibbonArcCapSweep = {
  /** 选择两个交点之间的短弧 */
  Short: 'short',
  /** 选择两个交点之间的长弧 */
  Long: 'long',
} as const;

/** ribbon 多 stop 宽度插值方式 */
export const RibbonWidthInterpolation = {
  /** 线性插值 */
  Linear: 'linear',
  /** 平滑插值 */
  Smooth: 'smooth',
  /** 阶梯插值 */
  Step: 'step',
} as const;

/** ribbon 起止宽度渐变插值方式 */
export const RibbonTaperInterpolation = {
  /** 线性插值 */
  Linear: 'linear',
  /** 平滑插值 */
  Smooth: 'smooth',
} as const;

/** Extension 内置 Ribbon 宽度 profile 名 */
export const BuiltinRibbonWidthProfile = {
  /** 使用中部鼓起的内置宽度曲线 */
  Bulge: 'bulge',
} as const;

export type RibbonMode = ValueOf<typeof RibbonMode>;

export type RibbonAlignment = ValueOf<typeof RibbonAlignment>;

export type BuiltinRibbonCap = ValueOf<typeof BuiltinRibbonCap>;

export type RibbonArcCapSweep = ValueOf<typeof RibbonArcCapSweep>;

/** ribbon 多 stop 宽度插值方式取值 */
export type RibbonWidthInterpolation = ValueOf<typeof RibbonWidthInterpolation>;

/** ribbon 起止宽度渐变插值方式取值 */
export type RibbonTaperInterpolation = ValueOf<typeof RibbonTaperInterpolation>;
