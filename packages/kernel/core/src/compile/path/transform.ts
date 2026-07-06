import { boundsCenter, boundsOf, isFinitePoint } from '@retikz/math';

import type { Transform } from '../../contract';
import type { IRPathScale, IRPosition } from '../../schemas';

import { applyTransformChain } from '../transform';

/** 一组点的 axis-aligned 包围盒中心 */
export const bboxCenter = (pts: ReadonlyArray<IRPosition>): IRPosition => {
  const bounds = boundsOf(pts);
  if (bounds === undefined) return [Number.NaN, Number.NaN];
  return boundsCenter(bounds);
};

/** path rotate / scale transform 构造输入。 */
export type BuildPathTransformsInput = {
  rotate: number | undefined;
  scale: IRPathScale | undefined;
  center: IRPosition;
  round: (n: number) => number;
};

/** 把 path 的 rotate / scale 编译为绕 bbox 中心的 transforms。 */
export const buildPathTransforms = ({
  rotate,
  scale,
  center,
  round,
}: BuildPathTransformsInput): Array<Transform> => {
  const out: Array<Transform> = [];
  if (rotate !== undefined) {
    out.push({ kind: 'rotate', degrees: rotate, cx: round(center[0]), cy: round(center[1]) });
  }
  if (scale !== undefined) {
    const sx = typeof scale === 'number' ? scale : scale.x;
    const sy = typeof scale === 'number' ? undefined : scale.y;
    // 绕 bbox center 缩放：translate(center) ∘ scale ∘ translate(-center)
    const scaleT: Transform = { kind: 'scale', x: sx };
    if (sy !== undefined) scaleT.y = sy;
    out.push({ kind: 'translate', x: round(center[0]), y: round(center[1]) }, scaleT, {
      kind: 'translate',
      x: round(-center[0]),
      y: round(-center[1]),
    });
  }
  return out;
};

/** 将 path bbox 点投影到整体 transform 后的坐标，并保留非有限坐标守卫。 */
export const projectPathTransformPoints = (
  points: ReadonlyArray<IRPosition>,
  transforms: ReadonlyArray<Transform>,
): Array<IRPosition> => {
  const transformedPoints = points.map(p => applyTransformChain(p, transforms));
  // scale × 坐标可能把 finite 输入放大溢出成 Infinity；非 finite 会污染 layout（round-trip 失真）
  if (!transformedPoints.every(isFinitePoint)) {
    throw new Error('Path rotate / scale produced a non-finite coordinate (scale too large); use a smaller scale.');
  }
  return transformedPoints;
};
