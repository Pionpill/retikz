import type { Position } from '@retikz/math';

import { arcBoundingPoints, arcEndPoint, boundsCenter, boundsHalfAxes, boundsOf } from '@retikz/math';

import type { AngleRange } from '../../shared';

import { DEG_TO_RAD, normalizeAngleRange } from '../../shared';

/**
 * sector 的派生几何。
 * @description 在圆心局部系计算 AABB、圆心偏移、质心偏移和 boundaryPoint 射线起点。
 */
export type SectorGeometry = {
  /** 规范化起止角与中分角。 */
  range: AngleRange;
  /** 含圆心 + 内外弧的精确 AABB 半轴。 */
  aabbHalfAxes: { halfWidth: number; halfHeight: number };
  /** 圆心(apex)相对 AABB 中心的偏移。 */
  apexOffset: Position;
  /** 质心(centroid)相对 AABB 中心的偏移。 */
  centroidOffset: Position;
  /** boundaryPoint 射线起点偏移；环形扇区使用填充环楔内的点，而不是质心。 */
  boundaryOriginOffset: Position;
};

type SectorGeometryInput = {
  innerRadius: number;
  outerRadius: number;
  startAngle: number;
  endAngle: number;
};

/**
 * 计算 sector 单一真源几何。
 * @description AABB 来自圆心、外弧和内弧候选点；质心使用环楔解析公式。
 */
export const sectorGeometry = (params: SectorGeometryInput): SectorGeometry => {
  const { innerRadius, outerRadius } = params;
  const range = normalizeAngleRange(params.startAngle, params.endAngle);
  const apex: Position = [0, 0];

  const candidates: Array<Position> = innerRadius === 0 ? [apex] : [];
  candidates.push(...arcBoundingPoints(apex, outerRadius, range.start, range.end));
  if (innerRadius > 0) {
    candidates.push(...arcBoundingPoints(apex, innerRadius, range.start, range.end));
  }

  const bounds = boundsOf(candidates);
  if (bounds === undefined) throw new Error('sectorGeometry: bounding candidates must not be empty.');
  // AABB 中心（圆心局部系）；apex(0,0) 相对 AABB 中心的偏移 = -AABB 中心。
  const aabbCenter = boundsCenter(bounds);
  const apexOffset: Position = [-aabbCenter[0], -aabbCenter[1]];

  // 质心：环楔（annular sector）质心在中分角方向上，到圆心距离。
  const sweepRad = (range.end - range.start) * DEG_TO_RAD;
  const midRad = range.mid * DEG_TO_RAD;
  const R = outerRadius;
  const r = innerRadius;
  const half = sweepRad / 2;
  const areaDenom = R * R - r * r;
  let centroidRadius: number;
  if (Math.abs(half) < 1e-9 || Math.abs(areaDenom) < 1e-12) {
    centroidRadius = (R + r) / 2;
  } else {
    centroidRadius = (2 / 3) * (Math.sin(half) / half) * ((R * R * R - r * r * r) / areaDenom);
  }
  const centroidLocal: Position = [Math.cos(midRad) * centroidRadius, Math.sin(midRad) * centroidRadius];
  const centroidOffset: Position = [centroidLocal[0] - aabbCenter[0], centroidLocal[1] - aabbCenter[1]];
  const boundaryOriginRadius = innerRadius > 0 ? (innerRadius + outerRadius) / 2 : centroidRadius;
  const boundaryOriginLocal: Position = [
    Math.cos(midRad) * boundaryOriginRadius,
    Math.sin(midRad) * boundaryOriginRadius,
  ];
  const boundaryOriginOffset: Position = [
    boundaryOriginLocal[0] - aabbCenter[0],
    boundaryOriginLocal[1] - aabbCenter[1],
  ];

  return {
    range,
    aabbHalfAxes: boundsHalfAxes(bounds),
    apexOffset,
    centroidOffset,
    boundaryOriginOffset,
  };
};

/** sector 局部系点（圆心为原点）：极角（度）+ 半径转直角坐标。 */
export const sectorPolarPoint = (radius: number, angleDeg: number): Position => arcEndPoint([0, 0], radius, angleDeg);
