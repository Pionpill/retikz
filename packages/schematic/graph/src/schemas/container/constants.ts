/** Container 和内容外壳使用的中性样式默认值 */
export const ContainerNeutralStyle = {
  /** 默认不填充外壳 */
  fill: 'transparent',
  /** 默认使用当前文本颜色绘制轮廓 */
  stroke: 'currentColor',
  /** 默认轮廓宽度 */
  strokeWidth: 1,
  /** 默认完全不透明 */
  opacity: 1,
} as const;

/** 内容驱动的双轴尺寸默认值 */
export const ContainerContentSizeDefault = {
  /** 水平方向由内容决定尺寸 */
  x: { kind: 'content' },
  /** 垂直方向由内容决定尺寸 */
  y: { kind: 'content' },
} as const;
