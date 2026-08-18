import type { ArcBoundingPointsInput, Position } from '../primitives';

import { DEFAULT_EPSILON } from '../constants';
import { arcAngleInRange } from '../primitives';

/** 射线与圆弧求交参数 */
export type RayArcInput = ArcBoundingPointsInput & {
  /** 射线起点 */
  origin: Position;
  /** 射线方向，不要求单位化 */
  dir: Position;
  /** 正向参数容差 */
  tolerance?: number;
};

/**
 * 射线（origin + s·dir）∩ 圆弧（center, radius, [startAngle, endAngle]）
 * @description 返回沿射线的正向参数 s，按升序排列；零方向或无有效交点时返回空数组
 */
export const rayArc = ({
  origin,
  dir,
  center,
  radius,
  startAngleDeg,
  endAngleDeg,
  tolerance = DEFAULT_EPSILON,
}: RayArcInput): Array<number> => {
  const ox = origin[0] - center[0];
  const oy = origin[1] - center[1];
  const ux = dir[0];
  const uy = dir[1];
  const a = ux * ux + uy * uy;
  if (a <= tolerance * tolerance) return [];
  const b = 2 * (ox * ux + oy * uy);
  const c = ox * ox + oy * oy - radius * radius;
  const disc = b * b - 4 * a * c;
  if (disc < 0) return [];
  const sq = Math.sqrt(disc);
  const roots = [(-b - sq) / (2 * a), (-b + sq) / (2 * a)];
  const hits: Array<number> = [];
  for (const s of roots) {
    if (s <= tolerance) continue;
    const px = ox + s * ux;
    const py = oy + s * uy;
    const angle = Math.atan2(py, px) * (180 / Math.PI);
    if (arcAngleInRange({ startAngleDeg, endAngleDeg, angleDeg: angle })) hits.push(s);
  }
  hits.sort((left, right) => left - right);
  return hits;
};
