import type { Position } from '../primitives';

import { DEFAULT_EPSILON } from '../constants';
import { vector2 } from '../primitives';

/** 两条无限直线求交参数 */
export type LineLineInput = {
  /** 第一条直线上的第一个点 */
  a1: Position;
  /** 第一条直线上的第二个点 */
  a2: Position;
  /** 第二条直线上的第一个点 */
  b1: Position;
  /** 第二条直线上的第二个点 */
  b2: Position;
};

/** 直线与圆求交参数 */
export type LineCircleInput = {
  /** 直线起点 */
  origin: Position;
  /** 直线方向，不要求单位化 */
  direction: Position;
  /** 圆心 */
  center: Position;
  /** 圆半径 */
  radius: number;
};

/** 两圆求交参数 */
export type CircleCircleInput = {
  /** 第一个圆心 */
  centerA: Position;
  /** 第一个圆半径 */
  radiusA: number;
  /** 第二个圆心 */
  centerB: Position;
  /** 第二个圆半径 */
  radiusB: number;
};

/** 两条无限直线（各由两点定）的交点；平行 / 共线返回 null */
const lineLine = ({ a1, a2, b1, b2 }: LineLineInput): Position | null => {
  const da: Position = [a2[0] - a1[0], a2[1] - a1[1]];
  const db: Position = [b2[0] - b1[0], b2[1] - b1[1]];
  const det = vector2.cross(da, db);
  if (Math.abs(det) < DEFAULT_EPSILON) return null;
  const dx = b1[0] - a1[0];
  const dy = b1[1] - a1[1];
  const t = (dx * db[1] - dy * db[0]) / det;
  return [a1[0] + da[0] * t, a1[1] + da[1] * t];
};

/** 直线（origin + direction，direction 不必单位化）∩ 圆，返回 0/1/2 交点；切线返回 2 个重合点，调用方自判 */
const lineCircle = ({ origin, direction, center, radius }: LineCircleInput): Array<Position> => {
  const ox = origin[0] - center[0];
  const oy = origin[1] - center[1];
  const a = direction[0] * direction[0] + direction[1] * direction[1];
  if (a <= DEFAULT_EPSILON * DEFAULT_EPSILON) return [];
  const b = 2 * (ox * direction[0] + oy * direction[1]);
  const c = ox * ox + oy * oy - radius * radius;
  const discriminant = b * b - 4 * a * c;
  if (discriminant < 0) return [];
  const discriminantRoot = Math.sqrt(discriminant);
  const intersections: Array<Position> = [];
  for (const lineParameter of [(-b - discriminantRoot) / (2 * a), (-b + discriminantRoot) / (2 * a)]) {
    intersections.push([origin[0] + direction[0] * lineParameter, origin[1] + direction[1] * lineParameter]);
  }
  return intersections;
};

/** 圆 ∩ 圆，返回 0/1/2 交点（重合 / 内含 / 相离返回空）；外 / 内切（discriminant≈0）返回 2 个重合点，调用方自判 */
const circleCircle = ({ centerA, radiusA, centerB, radiusB }: CircleCircleInput): Array<Position> => {
  const dx = centerB[0] - centerA[0];
  const dy = centerB[1] - centerA[1];
  const d = Math.hypot(dx, dy);
  if (
    d < DEFAULT_EPSILON ||
    d > radiusA + radiusB + DEFAULT_EPSILON ||
    d < Math.abs(radiusA - radiusB) - DEFAULT_EPSILON
  ) {
    return [];
  }
  const a = (radiusA * radiusA - radiusB * radiusB + d * d) / (2 * d);
  const h2 = radiusA * radiusA - a * a;
  const h = h2 > 0 ? Math.sqrt(h2) : 0;
  const mx = centerA[0] + (a * dx) / d;
  const my = centerA[1] + (a * dy) / d;
  const rx = (-dy * h) / d;
  const ry = (dx * h) / d;
  return [
    [mx + rx, my + ry],
    [mx - rx, my - ry],
  ];
};

/** 线段 ∩ 线段：真交叉返回交点；平行 / 共线（含重叠）/ 不相交返回 null */
const segmentSegment = ({ a1, a2, b1, b2 }: LineLineInput): Position | null => {
  const da: Position = [a2[0] - a1[0], a2[1] - a1[1]];
  const db: Position = [b2[0] - b1[0], b2[1] - b1[1]];
  const det = vector2.cross(da, db);
  if (Math.abs(det) < DEFAULT_EPSILON) return null;
  const dx = b1[0] - a1[0];
  const dy = b1[1] - a1[1];
  const t = (dx * db[1] - dy * db[0]) / det;
  const u = (dx * da[1] - dy * da[0]) / det;
  if (t < -DEFAULT_EPSILON || t > 1 + DEFAULT_EPSILON || u < -DEFAULT_EPSILON || u > 1 + DEFAULT_EPSILON) return null;
  return [a1[0] + da[0] * t, a1[1] + da[1] * t];
};

/**
 * 求交原语集（line / circle / segment），统一返回点（`Position | null` / `Array<Position>`）
 * @description ray∩arc 的返回值是沿射线的标量参数 `Array<number>`，因此由 `./arc-intersection` 单独导出
 */
export const intersect = { lineLine, lineCircle, circleCircle, segmentSegment };
