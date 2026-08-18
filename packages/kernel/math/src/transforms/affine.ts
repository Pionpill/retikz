import type { Position } from '../primitives';

/** SVG / Canvas 同序的二维仿射矩阵 `[a,b,c,d,e,f]` */
export type AffineMatrix = readonly [number, number, number, number, number, number];

/** 运行时不可变的二维仿射单位矩阵 */
export const AFFINE_IDENTITY: AffineMatrix = Object.freeze([1, 0, 0, 1, 0, 0]);

/**
 * 复合二维仿射矩阵
 * @description 返回 `outer × inner`，即对点先应用 `inner`，再应用 `outer`
 */
export const multiplyAffine = (outer: AffineMatrix, inner: AffineMatrix): AffineMatrix => [
  outer[0] * inner[0] + outer[2] * inner[1],
  outer[1] * inner[0] + outer[3] * inner[1],
  outer[0] * inner[2] + outer[2] * inner[3],
  outer[1] * inner[2] + outer[3] * inner[3],
  outer[0] * inner[4] + outer[2] * inner[5] + outer[4],
  outer[1] * inner[4] + outer[3] * inner[5] + outer[5],
];

/** 按 SVG / Canvas 六元组公式把二维点映射到新坐标 */
export const applyAffine = (matrix: AffineMatrix, point: Position): Position => [
  matrix[0] * point[0] + matrix[2] * point[1] + matrix[4],
  matrix[1] * point[0] + matrix[3] * point[1] + matrix[5],
];
