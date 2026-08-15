/** 归一化 sRGB 颜色与 alpha */
export type ParsedCssColor = {
  /** 红色通道，范围 0~1 */
  r: number;
  /** 绿色通道，范围 0~1 */
  g: number;
  /** 蓝色通道，范围 0~1 */
  b: number;
  /** 不透明度，范围 0~1 */
  a: number;
};
