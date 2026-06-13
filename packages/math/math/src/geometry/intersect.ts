import { rayArc } from './arc';
import { DEFAULT_EPSILON, type Position, point } from './point';

/** 两条无限直线（各由两点定）的交点；平行 / 共线返回 null */
const lineLine = (a1: Position, a2: Position, b1: Position, b2: Position): Position | null => {
  const da: Position = [a2[0] - a1[0], a2[1] - a1[1]];
  const db: Position = [b2[0] - b1[0], b2[1] - b1[1]];
  const det = point.cross(da, db);
  if (Math.abs(det) < DEFAULT_EPSILON) return null;
  const dx = b1[0] - a1[0];
  const dy = b1[1] - a1[1];
  const t = (dx * db[1] - dy * db[0]) / det;
  return [a1[0] + da[0] * t, a1[1] + da[1] * t];
};

/** 直线（origin + 方向 dir，dir 不必单位化）∩ 圆，返回 0/1/2 交点 */
const lineCircle = (origin: Position, dir: Position, center: Position, radius: number): Array<Position> => {
  const ox = origin[0] - center[0];
  const oy = origin[1] - center[1];
  const a = dir[0] * dir[0] + dir[1] * dir[1];
  if (a < DEFAULT_EPSILON) return [];
  const b = 2 * (ox * dir[0] + oy * dir[1]);
  const c = ox * ox + oy * oy - radius * radius;
  const disc = b * b - 4 * a * c;
  if (disc < 0) return [];
  const sq = Math.sqrt(disc);
  const out: Array<Position> = [];
  for (const t of [(-b - sq) / (2 * a), (-b + sq) / (2 * a)]) {
    out.push([origin[0] + dir[0] * t, origin[1] + dir[1] * t]);
  }
  return out;
};

/** 圆 ∩ 圆，返回 0/1/2 交点（重合 / 内含 / 相离返回空） */
const circleCircle = (cA: Position, rA: number, cB: Position, rB: number): Array<Position> => {
  const dx = cB[0] - cA[0];
  const dy = cB[1] - cA[1];
  const d = Math.hypot(dx, dy);
  if (d < DEFAULT_EPSILON || d > rA + rB + DEFAULT_EPSILON || d < Math.abs(rA - rB) - DEFAULT_EPSILON) return [];
  const a = (rA * rA - rB * rB + d * d) / (2 * d);
  const h2 = rA * rA - a * a;
  const h = h2 > 0 ? Math.sqrt(h2) : 0;
  const mx = cA[0] + (a * dx) / d;
  const my = cA[1] + (a * dy) / d;
  const rx = (-dy * h) / d;
  const ry = (dx * h) / d;
  return [[mx + rx, my + ry], [mx - rx, my - ry]];
};

/** 线段 ∩ 线段：真交叉返回交点；平行 / 共线（含重叠）/ 不相交返回 null（首切简化，见 ADR 待议） */
const segmentSegment = (a1: Position, a2: Position, b1: Position, b2: Position): Position | null => {
  const da: Position = [a2[0] - a1[0], a2[1] - a1[1]];
  const db: Position = [b2[0] - b1[0], b2[1] - b1[1]];
  const det = point.cross(da, db);
  if (Math.abs(det) < DEFAULT_EPSILON) return null;
  const dx = b1[0] - a1[0];
  const dy = b1[1] - a1[1];
  const t = (dx * db[1] - dy * db[0]) / det;
  const u = (dx * da[1] - dy * da[0]) / det;
  if (t < -DEFAULT_EPSILON || t > 1 + DEFAULT_EPSILON || u < -DEFAULT_EPSILON || u > 1 + DEFAULT_EPSILON) return null;
  return [a1[0] + da[0] * t, a1[1] + da[1] * t];
};

/** 求交原语集（line / circle / segment）；ray∩arc 见 `arc` 模块（此处转出便于统一入口） */
export const intersect = { lineLine, lineCircle, circleCircle, segmentSegment, rayArc };
