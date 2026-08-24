export const RibbonMode = {
  Centerline: 'centerline',
  Boundary: 'boundary',
} as const;

export const RibbonAlignment = {
  Center: 'center',
  Left: 'left',
  Right: 'right',
} as const;

export const RibbonCap = {
  Butt: 'butt',
  Round: 'round',
  Square: 'square',
} as const;

export const RibbonArcCapSweep = {
  Short: 'short',
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

/** Standard 内置 Ribbon 宽度 profile 名 */
export const RibbonWidthProfile = {
  Bulge: 'bulge',
} as const;
