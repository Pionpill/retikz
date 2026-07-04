import type { Position } from './point';

/** 轴对齐外接范围。 */
export type AxisAlignedBounds = {
  /** 最小 x 坐标。 */
  minX: number;
  /** 最小 y 坐标。 */
  minY: number;
  /** 最大 x 坐标。 */
  maxX: number;
  /** 最大 y 坐标。 */
  maxY: number;
};

/** 轴对齐外接范围半轴。 */
export type BoundsHalfAxes = {
  /** x 方向半宽。 */
  halfWidth: number;
  /** y 方向半高。 */
  halfHeight: number;
};

/**
 * 点集的轴对齐外接范围。
 * @description 输入为空时返回 undefined；调用方按自身语义决定兜底、报错或忽略。
 */
export const boundsOf = (points: ReadonlyArray<Position>): AxisAlignedBounds | undefined => {
  if (points.length === 0) return undefined;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const [x, y] of points) {
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }
  return { maxX, maxY, minX, minY };
};

/** 轴对齐外接范围中心。 */
export const boundsCenter = ({ maxX, maxY, minX, minY }: AxisAlignedBounds): Position => [
  (minX + maxX) / 2,
  (minY + maxY) / 2,
];

/** 轴对齐外接范围半轴。 */
export const boundsHalfAxes = ({ maxX, maxY, minX, minY }: AxisAlignedBounds): BoundsHalfAxes => ({
  halfWidth: (maxX - minX) / 2,
  halfHeight: (maxY - minY) / 2,
});
