import { type Position, point } from './point';

/**
 * 凸包（Andrew's monotone chain）
 * @description 返回 CCW 顺序顶点、不含共线中间点；点数 < 3 时返回按 (x,y) 排序去重后的点。
 *   叉积 ≤ 0 视为右转 / 共线并弹出 → 严格凸包（剔除共线）。全部点共线时（无论点数）退化为两端点。
 */
export const convexHull = (points: Array<Position>): Array<Position> => {
  const pts = [...points].sort((a, b) => (a[0] === b[0] ? a[1] - b[1] : a[0] - b[0]));
  const uniq: Array<Position> = [];
  for (const p of pts) {
    const last: Position | undefined = uniq.length > 0 ? uniq[uniq.length - 1] : undefined;
    if (!last || last[0] !== p[0] || last[1] !== p[1]) uniq.push(p);
  }
  if (uniq.length < 3) return uniq;

  const cross = (o: Position, a: Position, b: Position): number =>
    point.cross([a[0] - o[0], a[1] - o[1]], [b[0] - o[0], b[1] - o[1]]);

  const lower: Array<Position> = [];
  for (const p of uniq) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop();
    lower.push(p);
  }
  const upper: Array<Position> = [];
  for (let i = uniq.length - 1; i >= 0; i--) {
    const p = uniq[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop();
    upper.push(p);
  }
  lower.pop();
  upper.pop();
  return lower.concat(upper);
};
