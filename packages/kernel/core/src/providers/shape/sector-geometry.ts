import type { Position } from '@retikz/math';

import { arcBoundingPoints, arcEndPoint } from '@retikz/math';

import type { AngleRange } from '../../shared';

import { DEG_TO_RAD, normalizeAngleRange } from '../../shared';

/**
 * sector 的派生几何。
 *
 * @description 据 params（内外半径 + 起止角）在「圆心(apex)为原点」局部系算精确 AABB 与各特征点偏移。
 *   AABB 覆盖圆心、外弧、内弧以及弧跨过的轴向极值点；apex / centroid 等特征点以「相对 AABB 中心的偏移」给出。
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
 *
 * @description 局部系以圆心为原点：候选极值点 = 圆心、外弧 bbox 点、内弧 bbox 点。
 *   由这些点的 min/max 得 AABB，质心使用环楔解析公式。
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

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const [px, py] of candidates) {
    if (px < minX) minX = px;
    if (px > maxX) maxX = px;
    if (py < minY) minY = py;
    if (py > maxY) maxY = py;
  }

  const halfWidth = (maxX - minX) / 2;
  const halfHeight = (maxY - minY) / 2;
  // AABB 中心（圆心局部系）；apex(0,0) 相对 AABB 中心的偏移 = -AABB 中心。
  const aabbCenter: Position = [(minX + maxX) / 2, (minY + maxY) / 2];
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
    aabbHalfAxes: { halfWidth, halfHeight },
    apexOffset,
    centroidOffset,
    boundaryOriginOffset,
  };
};

/** sector 局部系点（圆心为原点）：极角（度）+ 半径转直角坐标。 */
export const sectorPolarPoint = (radius: number, angleDeg: number): Position => arcEndPoint([0, 0], radius, angleDeg);
