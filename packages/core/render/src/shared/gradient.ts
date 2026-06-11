/**
 * 渐变几何（renderer 无关纯函数）：SVG 与 Canvas 后端共用，避免线端点公式两处漂移。
 */

/** 单位方框（objectBoundingBox，0..1）内的渐变线端点 */
export type GradientLine = { x1: number; y1: number; x2: number; y2: number };

/**
 * 渐变角度 → objectBoundingBox 单位方框内、过中心 (0.5,0.5)、长度 1 的渐变线端点
 * @description angle 单位为度，polar 约定（0 = +x，90 = +y，屏幕 y-down）；缺省 0（左→右）。
 *   SVG 端直接用作 `x1/y1/x2/y2`（objectBoundingBox 坐标）；Canvas 端各分量乘 bbox 宽高再加 bbox 原点。
 */
export const gradientLineFromAngle = (angle: number | undefined): GradientLine => {
  const rad = ((angle ?? 0) * Math.PI) / 180;
  const dx = Math.cos(rad);
  const dy = Math.sin(rad);
  return { x1: 0.5 - dx * 0.5, y1: 0.5 - dy * 0.5, x2: 0.5 + dx * 0.5, y2: 0.5 + dy * 0.5 };
};
