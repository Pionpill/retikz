/** 补齐 CSS 显示尺寸；数值轴按内容比例推导，CSS 字符串由浏览器按固有比例排版 */
export const computeDisplaySize = (
  layout: Readonly<{ width: number; height: number }>,
  width?: number | string,
  height?: number | string,
): { width: number | string; height: number | string } => {
  const intrinsicWidth = layout.width > 0 ? layout.width : 1;
  const intrinsicHeight = layout.height > 0 ? layout.height : 1;
  return {
    width:
      width ??
      (typeof height === 'number'
        ? (height * intrinsicWidth) / intrinsicHeight
        : height === undefined
          ? intrinsicWidth
          : 'auto'),
    height:
      height ??
      (typeof width === 'number'
        ? (width * intrinsicHeight) / intrinsicWidth
        : width === undefined
          ? intrinsicHeight
          : 'auto'),
  };
};
