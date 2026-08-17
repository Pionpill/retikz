import type { Position } from './point';

const DEG_TO_RAD = Math.PI / 180;

const normalizeDeg = (deg: number): number => {
  const m = deg % 360;
  return m < 0 ? m + 360 : m;
};

/** 圆弧外接候选点参数 */
export type ArcBoundingPointsInput = {
  /** 圆心 */
  center: Position;
  /** 半径 */
  radius: number;
  /** 起始角度，单位为度 */
  startAngleDeg: number;
  /** 结束角度，单位为度 */
  endAngleDeg: number;
};

/** 圆弧角度区间判定参数 */
export type ArcAngleInRangeInput = {
  /** 起始角度，单位为度 */
  startAngleDeg: number;
  /** 结束角度，单位为度 */
  endAngleDeg: number;
  /** 待判定角度，单位为度 */
  angleDeg: number;
  /** 角度容差，单位为度 */
  toleranceDeg?: number;
};

/** 椭圆弧参数点参数 */
export type EllipseArcPointInput = {
  /** 椭圆中心 */
  center: Position;
  /** x 方向半轴 */
  radiusX: number;
  /** y 方向半轴 */
  radiusY: number;
  /** 参数角，单位为度 */
  angleDeg: number;
};

/** 椭圆弧外接候选点参数 */
export type EllipseArcBoundingPointsInput = Omit<EllipseArcPointInput, 'angleDeg'> & {
  /** 起始参数角，单位为度 */
  startAngleDeg: number;
  /** 结束参数角，单位为度 */
  endAngleDeg: number;
};

/**
 * 枚举角度区间内的轴向极值候选角
 * @description 返回对应于 `[lo, hi]` 区间的规范轴向角；跨度达到一整圈时最多返回四个方向
 * @remarks 复杂度：时间 O(1)，空间 O(1)；角度按 360° 周期归一化
 */
const axisAngles = (lo: number, hi: number): Array<number> => {
  if (!Number.isFinite(lo) || !Number.isFinite(hi) || hi < lo) return [];
  const span = hi - lo;
  if (!Number.isFinite(span) || span >= 360) return [0, 90, 180, 270];

  const normalizedLo = normalizeDeg(lo);
  const normalizedHi = normalizedLo + span;
  const kStart = Math.ceil(normalizedLo / 90);
  const kEnd = Math.floor(normalizedHi / 90);
  const angles: Array<number> = [];
  for (let k = kStart; k <= kEnd; k++) angles.push(normalizeDeg(k * 90));
  return angles;
};

/** 圆心、半径、角度（度，与 polar.toPosition 同约定）→ 圆周上对应点 */
export const arcEndPoint = (center: Position, radius: number, angleDeg: number): Position => {
  const rad = angleDeg * DEG_TO_RAD;
  return [center[0] + Math.cos(rad) * radius, center[1] + Math.sin(rad) * radius];
};

/**
 * 弧的 bbox 极值候选：起点、终点，加 [startAngle,endAngle] 内所有 90°·k 方向的圆周点
 * @description 不去重；端角恰在 90°·k 上时由调用方处理
 */
export const arcBoundingPoints = ({
  center,
  radius,
  startAngleDeg,
  endAngleDeg,
}: ArcBoundingPointsInput): Array<Position> => {
  const points: Array<Position> = [
    arcEndPoint(center, radius, startAngleDeg),
    arcEndPoint(center, radius, endAngleDeg),
  ];

  const lo = Math.min(startAngleDeg, endAngleDeg);
  const hi = Math.max(startAngleDeg, endAngleDeg);
  const normalizedStart = normalizeDeg(startAngleDeg);
  const normalizedEnd = normalizeDeg(endAngleDeg);
  for (const angle of axisAngles(lo, hi)) {
    // 端角已通过端点投影包含
    if (angle === normalizedStart || angle === normalizedEnd) continue;
    points.push(arcEndPoint(center, radius, angle));
  }
  return points;
};

/**
 * 角度 a（度）是否落在弧的角度区间 [startAngle, endAngle] 内（含端点，带容差）
 * @description start 到 end 为正时按屏幕顺时针扫描，为负时按逆时针扫描
 */
export const arcAngleInRange = ({
  startAngleDeg,
  endAngleDeg,
  angleDeg,
  toleranceDeg = 1e-7,
}: ArcAngleInRangeInput): boolean => {
  const span = endAngleDeg - startAngleDeg;
  const total = Math.abs(span);
  if (total >= 360 - toleranceDeg) return true; // 整圆
  const ccw = span < 0;
  const raw = ccw ? startAngleDeg - angleDeg : angleDeg - startAngleDeg;
  const swept = normalizeDeg(raw);
  return swept <= total + toleranceDeg || swept >= 360 - toleranceDeg;
};

/**
 * 椭圆弧参数点：中心 + 半轴 rx/ry + 参数角（度）→ 椭圆周上点
 * @description 与 arcEndPoint 同角度约定；θ 是参数角，不一定等于真实极角
 */
export const ellipseArcPoint = ({ center, radiusX, radiusY, angleDeg }: EllipseArcPointInput): Position => {
  const rad = angleDeg * DEG_TO_RAD;
  return [center[0] + Math.cos(rad) * radiusX, center[1] + Math.sin(rad) * radiusY];
};

/**
 * 椭圆弧 bbox 极值候选：起点、终点，加 [start,end] 区间内所有 90°·k 参数角处的椭圆周点
 * @description 只处理轴对齐椭圆弧，候选点不去重
 */
export const ellipseArcBoundingPoints = ({
  center,
  radiusX,
  radiusY,
  startAngleDeg,
  endAngleDeg,
}: EllipseArcBoundingPointsInput): Array<Position> => {
  const points: Array<Position> = [
    ellipseArcPoint({ center, radiusX, radiusY, angleDeg: startAngleDeg }),
    ellipseArcPoint({ center, radiusX, radiusY, angleDeg: endAngleDeg }),
  ];
  const lo = Math.min(startAngleDeg, endAngleDeg);
  const hi = Math.max(startAngleDeg, endAngleDeg);
  const normalizedStart = normalizeDeg(startAngleDeg);
  const normalizedEnd = normalizeDeg(endAngleDeg);
  for (const angle of axisAngles(lo, hi)) {
    if (angle === normalizedStart || angle === normalizedEnd) continue;
    points.push(ellipseArcPoint({ center, radiusX, radiusY, angleDeg: angle }));
  }
  return points;
};
