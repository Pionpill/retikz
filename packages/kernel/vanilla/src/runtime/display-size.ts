/** 从内容边界推导 DOM 宿主尺寸，单轴显式尺寸保持内容比例 */
export const computeDisplaySize = (
  layout: Readonly<{ width: number; height: number }>,
  width?: number,
  height?: number,
): { width: number; height: number } => {
  const intrinsicWidth = layout.width > 0 ? layout.width : 1;
  const intrinsicHeight = layout.height > 0 ? layout.height : 1;
  return {
    width: width ?? (height === undefined ? intrinsicWidth : (height * intrinsicWidth) / intrinsicHeight),
    height: height ?? (width === undefined ? intrinsicHeight : (width * intrinsicHeight) / intrinsicWidth),
  };
};
