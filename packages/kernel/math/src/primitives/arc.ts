import type { Position } from './point';

const DEG_TO_RAD = Math.PI / 180;

const normalizeAngleDegrees = (angleDegrees: number): number => {
  const normalizedDegrees = angleDegrees % 360;
  return normalizedDegrees < 0 ? normalizedDegrees + 360 : normalizedDegrees;
};

/** 圆弧外接候选点参数 */
export type ArcBoundingCandidatesInput = {
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
export type ArcSweepAngleInput = {
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
export type EllipseArcAnglePointInput = {
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
export type EllipseArcBoundingCandidatesInput = Omit<EllipseArcAnglePointInput, 'angleDeg'> & {
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
const collectAxisAngles = (lowerAngle: number, upperAngle: number): Array<number> => {
  if (!Number.isFinite(lowerAngle) || !Number.isFinite(upperAngle) || upperAngle < lowerAngle) return [];
  const span = upperAngle - lowerAngle;
  if (!Number.isFinite(span) || span >= 360) return [0, 90, 180, 270];

  const normalizedLowerAngle = normalizeAngleDegrees(lowerAngle);
  const normalizedUpperAngle = normalizedLowerAngle + span;
  const startAxisIndex = Math.ceil(normalizedLowerAngle / 90);
  const endAxisIndex = Math.floor(normalizedUpperAngle / 90);
  const angles: Array<number> = [];
  for (let axisIndex = startAxisIndex; axisIndex <= endAxisIndex; axisIndex++) {
    angles.push(normalizeAngleDegrees(axisIndex * 90));
  }
  return angles;
};

/** 圆心、半径、角度（度，与 polar.toPosition 同约定）→ 圆周上对应点 */
export const pointAtArcAngle = (center: Position, radius: number, angleDeg: number): Position => {
  const angleRadians = angleDeg * DEG_TO_RAD;
  return [center[0] + Math.cos(angleRadians) * radius, center[1] + Math.sin(angleRadians) * radius];
};

/**
 * 弧的 bbox 极值候选：起点、终点，加 [startAngle,endAngle] 内所有 90°·k 方向的圆周点
 * @description 不去重；端角恰在 90°·k 上时由调用方处理
 */
export const collectArcBoundingCandidates = ({
  center,
  radius,
  startAngleDeg,
  endAngleDeg,
}: ArcBoundingCandidatesInput): Array<Position> => {
  const points: Array<Position> = [
    pointAtArcAngle(center, radius, startAngleDeg),
    pointAtArcAngle(center, radius, endAngleDeg),
  ];

  const lowerAngle = Math.min(startAngleDeg, endAngleDeg);
  const upperAngle = Math.max(startAngleDeg, endAngleDeg);
  const normalizedStartAngle = normalizeAngleDegrees(startAngleDeg);
  const normalizedEndAngle = normalizeAngleDegrees(endAngleDeg);
  for (const angle of collectAxisAngles(lowerAngle, upperAngle)) {
    // 端角已通过端点投影包含
    if (angle === normalizedStartAngle || angle === normalizedEndAngle) continue;
    points.push(pointAtArcAngle(center, radius, angle));
  }
  return points;
};

/**
 * 角度 a（度）是否落在弧的角度区间 [startAngle, endAngle] 内（含端点，带容差）
 * @description start 到 end 为正时按屏幕顺时针扫描，为负时按逆时针扫描
 */
export const isAngleWithinArcSweep = ({
  startAngleDeg,
  endAngleDeg,
  angleDeg,
  toleranceDeg = 1e-7,
}: ArcSweepAngleInput): boolean => {
  const span = endAngleDeg - startAngleDeg;
  const total = Math.abs(span);
  if (total >= 360 - toleranceDeg) return true; // 整圆
  const ccw = span < 0;
  const raw = ccw ? startAngleDeg - angleDeg : angleDeg - startAngleDeg;
  const swept = normalizeAngleDegrees(raw);
  return swept <= total + toleranceDeg || swept >= 360 - toleranceDeg;
};

/**
 * 椭圆弧参数点：中心 + 半轴 rx/ry + 参数角（度）→ 椭圆周上点
 * @description 与 pointAtArcAngle 同角度约定；θ 是参数角，不一定等于真实极角
 */
export const pointAtEllipseArcAngle = ({ center, radiusX, radiusY, angleDeg }: EllipseArcAnglePointInput): Position => {
  const angleRadians = angleDeg * DEG_TO_RAD;
  return [center[0] + Math.cos(angleRadians) * radiusX, center[1] + Math.sin(angleRadians) * radiusY];
};

/**
 * 椭圆弧 bbox 极值候选：起点、终点，加 [start,end] 区间内所有 90°·k 参数角处的椭圆周点
 * @description 只处理轴对齐椭圆弧，候选点不去重
 */
export const collectEllipseArcBoundingCandidates = ({
  center,
  radiusX,
  radiusY,
  startAngleDeg,
  endAngleDeg,
}: EllipseArcBoundingCandidatesInput): Array<Position> => {
  const points: Array<Position> = [
    pointAtEllipseArcAngle({ center, radiusX, radiusY, angleDeg: startAngleDeg }),
    pointAtEllipseArcAngle({ center, radiusX, radiusY, angleDeg: endAngleDeg }),
  ];
  const lowerAngle = Math.min(startAngleDeg, endAngleDeg);
  const upperAngle = Math.max(startAngleDeg, endAngleDeg);
  const normalizedStartAngle = normalizeAngleDegrees(startAngleDeg);
  const normalizedEndAngle = normalizeAngleDegrees(endAngleDeg);
  for (const angle of collectAxisAngles(lowerAngle, upperAngle)) {
    if (angle === normalizedStartAngle || angle === normalizedEndAngle) continue;
    points.push(pointAtEllipseArcAngle({ center, radiusX, radiusY, angleDeg: angle }));
  }
  return points;
};
