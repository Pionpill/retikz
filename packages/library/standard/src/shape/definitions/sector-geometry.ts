import type { Position } from '@retikz/math';

import { DEG_TO_RAD, normalizeAngleRange } from '@retikz/core';
import { arcBoundingPoints, arcEndPoint, boundsCenter, boundsHalfAxes, boundsOf, DEFAULT_EPSILON } from '@retikz/math';

/** Sector 的派生几何 */
export type SectorGeometry = {
  range: { start: number; end: number; mid: number };
  aabbHalfAxes: { halfWidth: number; halfHeight: number };
  apexOffset: Position;
  centroidOffset: Position;
  boundaryOriginOffset: Position;
};

type SectorGeometryInput = {
  innerRadius: number;
  outerRadius: number;
  startAngle: number;
  endAngle: number;
};

/** 计算 Sector 单一真源几何 */
export const sectorGeometry = (params: SectorGeometryInput): SectorGeometry => {
  const { innerRadius, outerRadius } = params;
  const range = normalizeAngleRange(params.startAngle, params.endAngle);
  const apex: Position = [0, 0];
  const candidates: Array<Position> = innerRadius === 0 ? [apex] : [];
  candidates.push(
    ...arcBoundingPoints({ center: apex, radius: outerRadius, startAngleDeg: range.start, endAngleDeg: range.end }),
  );
  if (innerRadius > 0) {
    candidates.push(
      ...arcBoundingPoints({ center: apex, radius: innerRadius, startAngleDeg: range.start, endAngleDeg: range.end }),
    );
  }
  const bounds = boundsOf(candidates);
  if (bounds === undefined) throw new Error('sectorGeometry: bounding candidates must not be empty.');
  const aabbCenter = boundsCenter(bounds);
  const apexOffset: Position = [-aabbCenter[0], -aabbCenter[1]];
  const sweepRad = (range.end - range.start) * DEG_TO_RAD;
  const midRad = range.mid * DEG_TO_RAD;
  const half = sweepRad / 2;
  const areaDenom = outerRadius * outerRadius - innerRadius * innerRadius;
  const centroidRadius =
    Math.abs(half) < DEFAULT_EPSILON || Math.abs(areaDenom) < 1e-12
      ? (outerRadius + innerRadius) / 2
      : (2 / 3) *
        (Math.sin(half) / half) *
        ((outerRadius * outerRadius * outerRadius - innerRadius * innerRadius * innerRadius) / areaDenom);
  const centroidLocal: Position = [Math.cos(midRad) * centroidRadius, Math.sin(midRad) * centroidRadius];
  const boundaryOriginRadius = innerRadius > 0 ? (innerRadius + outerRadius) / 2 : centroidRadius;
  const boundaryOriginLocal: Position = [
    Math.cos(midRad) * boundaryOriginRadius,
    Math.sin(midRad) * boundaryOriginRadius,
  ];
  return {
    range,
    aabbHalfAxes: boundsHalfAxes(bounds),
    apexOffset,
    centroidOffset: [centroidLocal[0] - aabbCenter[0], centroidLocal[1] - aabbCenter[1]],
    boundaryOriginOffset: [boundaryOriginLocal[0] - aabbCenter[0], boundaryOriginLocal[1] - aabbCenter[1]],
  };
};

/** Sector 圆心局部系的极坐标点 */
export const sectorPolarPoint = (radius: number, angleDeg: number): Position => arcEndPoint([0, 0], radius, angleDeg);
