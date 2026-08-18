import type { Position } from '@retikz/math';

import type { Rect } from './rect';

import { RetikzCoreError, RetikzCoreErrorCode } from '../../error';

/** 规则连接面包络种类 */
type ConnectionEnvelopeKind = 'circle' | 'ellipse' | 'rectangle';

/** 规则连接面半轴 */
type ConnectionEnvelope = { halfWidth: number; halfHeight: number };

/** 校验点集包络不是单点，并返回稳定的等轴退化 fallback */
const positiveRadius = (radius: number): number => {
  if (!Number.isFinite(radius) || radius <= 0) {
    throw new RetikzCoreError(
      RetikzCoreErrorCode.Geometry,
      'connection envelope is degenerate: expected at least one positive half-axis',
    );
  }
  return radius;
};

/** 从视觉 AABB 得到安全的规则连接面半轴 */
export const boundsConnectionEnvelope = (rect: Rect, kind: ConnectionEnvelopeKind): ConnectionEnvelope => {
  const halfWidth = rect.width / 2;
  const halfHeight = rect.height / 2;
  if (kind === 'circle') {
    const radius = positiveRadius(Math.hypot(halfWidth, halfHeight));
    return { halfWidth: radius, halfHeight: radius };
  }
  if (kind === 'ellipse') {
    if (halfWidth <= 0 || halfHeight <= 0) {
      const radius = positiveRadius(Math.max(halfWidth, halfHeight));
      return { halfWidth: radius, halfHeight: radius };
    }
    return { halfWidth: halfWidth * Math.SQRT2, halfHeight: halfHeight * Math.SQRT2 };
  }
  return { halfWidth, halfHeight };
};

/**
 * 从 AABB 中心局部点集得到规则连接面半轴
 * @description ellipse 保持点集 AABB 的纵横比并统一缩放到包含全部顶点；共线点集回退等轴包络
 */
export const pointsConnectionEnvelope = (
  points: ReadonlyArray<Position>,
  kind: ConnectionEnvelopeKind,
): ConnectionEnvelope => {
  let maxAbsX = 0;
  let maxAbsY = 0;
  let maxRadius = 0;
  for (const [x, y] of points) {
    maxAbsX = Math.max(maxAbsX, Math.abs(x));
    maxAbsY = Math.max(maxAbsY, Math.abs(y));
    maxRadius = Math.max(maxRadius, Math.hypot(x, y));
  }

  if (kind === 'circle') {
    const radius = positiveRadius(maxRadius);
    return { halfWidth: radius, halfHeight: radius };
  }
  if (kind === 'rectangle') return { halfWidth: maxAbsX, halfHeight: maxAbsY };
  if (maxAbsX <= 0 || maxAbsY <= 0) {
    const radius = positiveRadius(maxRadius);
    return { halfWidth: radius, halfHeight: radius };
  }

  let scale = 1;
  for (const [x, y] of points) {
    scale = Math.max(scale, Math.hypot(x / maxAbsX, y / maxAbsY));
  }
  return { halfWidth: maxAbsX * scale, halfHeight: maxAbsY * scale };
};
