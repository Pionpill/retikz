import type { Position } from '../primitives';

import { vector2 } from '../primitives';

/**
 * 凸包（Andrew's monotone chain）
 * @description 返回 CCW 顺序顶点、不含共线中间点；点数 < 3 时返回按 (x,y) 排序去重后的点。
 *   全部点共线时退化为两端点
 * @remarks 复杂度：时间 O(n log n)，空间 O(n)，n 为输入点数
 */
export const convexHull = (points: Array<Position>): Array<Position> => {
  const sortedPoints = [...points].sort((left, right) =>
    left[0] === right[0] ? left[1] - right[1] : left[0] - right[0],
  );
  const uniquePoints: Array<Position> = [];
  for (const point of sortedPoints) {
    const previousPoint: Position | undefined =
      uniquePoints.length > 0 ? uniquePoints[uniquePoints.length - 1] : undefined;
    if (!previousPoint || previousPoint[0] !== point[0] || previousPoint[1] !== point[1]) {
      uniquePoints.push(point);
    }
  }
  if (uniquePoints.length < 3) return uniquePoints;

  const cross = (o: Position, a: Position, b: Position): number =>
    vector2.cross([a[0] - o[0], a[1] - o[1]], [b[0] - o[0], b[1] - o[1]]);

  const lower: Array<Position> = [];
  for (const point of uniquePoints) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], point) <= 0) {
      lower.pop();
    }
    lower.push(point);
  }
  const upper: Array<Position> = [];
  for (let index = uniquePoints.length - 1; index >= 0; index--) {
    const point = uniquePoints[index];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], point) <= 0) {
      upper.pop();
    }
    upper.push(point);
  }
  lower.pop();
  upper.pop();
  return lower.concat(upper);
};
