import type { IRPosition } from '../ir';
import type { ViewBox } from '../primitive';

/**
 * 由所有"贡献给 bbox"的点算出 viewBox（含四周 padding）。
 * points 为空时返回固定的 100×100 兜底框。
 */
export const computeViewBox = (
  points: Array<IRPosition>,
  padding: number,
  round: (n: number) => number,
): ViewBox => {
  if (points.length === 0) return { x: 0, y: 0, width: 100, height: 100 };
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
  return {
    x: round(minX - padding),
    y: round(minY - padding),
    width: round(maxX - minX + padding * 2),
    height: round(maxY - minY + padding * 2),
  };
};
