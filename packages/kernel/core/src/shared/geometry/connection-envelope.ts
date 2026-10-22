import { ellipse } from '@retikz/math';
import type { BoundsHalfAxes, CenteredBox, Position } from '@retikz/math';

import { RetikzCoreError, RetikzCoreErrorCode } from '../../error';

/** 用于连线的外包形状种类 */
type ConnectionEnvelopeKind = 'circle' | 'ellipse' | 'rectangle';

/** 检查半径是否为有限正数，无效时报告错误 */
const positiveRadius = (radius: number): number => {
  if (!Number.isFinite(radius) || radius <= 0) {
    throw new RetikzCoreError(
      RetikzCoreErrorCode.Geometry,
      'connection envelope is degenerate: expected at least one positive half-axis',
    );
  }

  return radius;
};

/** 根据图形外框计算能包住它的连接面半宽和半高 */
export const boundsConnectionEnvelope = (rect: CenteredBox, kind: ConnectionEnvelopeKind): BoundsHalfAxes => {
  const halfWidth = rect.width / 2;
  const halfHeight = rect.height / 2;
  if (kind === 'circle') {
    const axes = ellipse.circumscribedHalfAxes({ halfWidth, halfHeight }, 'equal');
    positiveRadius(axes.halfWidth);
    return axes;
  }

  if (kind === 'ellipse') {
    if (halfWidth <= 0 || halfHeight <= 0) {
      const radius = positiveRadius(Math.max(halfWidth, halfHeight));
      return { halfWidth: radius, halfHeight: radius };
    }

    return ellipse.circumscribedHalfAxes({ halfWidth, halfHeight });
  }

  return { halfWidth, halfHeight };
};

/**
 * 根据相对中心的点坐标，计算能包住全部点的连接面半宽和半高
 * @description 椭圆保持点集外框的宽高比例；宽或高为零时改用圆形包围
 */
export const pointsConnectionEnvelope = (
  points: ReadonlyArray<Position>,
  kind: ConnectionEnvelopeKind,
): BoundsHalfAxes => {
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
