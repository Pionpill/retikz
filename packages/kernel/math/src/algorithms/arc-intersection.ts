import type { ArcBoundingCandidatesInput, Position } from '../primitives';

import { DEFAULT_EPSILON } from '../constants';
import { isAngleWithinArcSweep } from '../primitives';

/** 射线与圆弧求交参数 */
export type RayArcIntersectionInput = ArcBoundingCandidatesInput & {
  /** 射线起点 */
  origin: Position;
  /** 射线方向，不要求单位化 */
  direction: Position;
  /** 正向参数容差 */
  tolerance?: number;
};

/**
 * 射线（origin + s·direction）∩ 圆弧（center, radius, [startAngle, endAngle]）
 * @description 返回沿射线的正向参数 s，按升序排列；零方向或无有效交点时返回空数组
 */
export const intersectRayWithArc = ({
  origin,
  direction,
  center,
  radius,
  startAngleDeg,
  endAngleDeg,
  tolerance = DEFAULT_EPSILON,
}: RayArcIntersectionInput): Array<number> => {
  const ox = origin[0] - center[0];
  const oy = origin[1] - center[1];
  const directionX = direction[0];
  const directionY = direction[1];
  const a = directionX * directionX + directionY * directionY;
  if (a <= tolerance * tolerance) return [];
  const b = 2 * (ox * directionX + oy * directionY);
  const c = ox * ox + oy * oy - radius * radius;
  const discriminant = b * b - 4 * a * c;
  if (discriminant < 0) return [];
  const discriminantRoot = Math.sqrt(discriminant);
  const roots = [(-b - discriminantRoot) / (2 * a), (-b + discriminantRoot) / (2 * a)];
  const intersections: Array<number> = [];
  for (const rayParameter of roots) {
    if (rayParameter <= tolerance) continue;
    const pointX = ox + rayParameter * directionX;
    const pointY = oy + rayParameter * directionY;
    const angle = Math.atan2(pointY, pointX) * (180 / Math.PI);
    if (isAngleWithinArcSweep({ startAngleDeg, endAngleDeg, angleDeg: angle })) {
      intersections.push(rayParameter);
    }
  }
  intersections.sort((left, right) => left - right);
  return intersections;
};
