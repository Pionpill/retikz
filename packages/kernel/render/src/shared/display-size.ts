/** 按内容比例补齐输出尺寸；退化轴以一个 CSS 像素承载 */
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
