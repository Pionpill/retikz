import type { Transform } from '../../contract';
import type { IRPathScale, IRPosition } from '../../schemas';

import { applyTransformChain } from '../scope';

/** 有限数 */
const isFiniteNum = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n);

/** 有限坐标点 `[number, number]` */
const isFinitePoint = (pt: unknown): boolean =>
  Array.isArray(pt) && pt.length >= 2 && isFiniteNum(pt[0]) && isFiniteNum(pt[1]);

/** 一组点的 axis-aligned 包围盒中心 */
export const bboxCenter = (pts: ReadonlyArray<IRPosition>): IRPosition => {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const [x, y] of pts) {
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }
  return [(minX + maxX) / 2, (minY + maxY) / 2];
};

/**
 * path 整体 rotate / scale → 绕包围盒中心的 GroupPrim transforms
 * @description rotate 写成 `{ kind:'rotate', degrees, cx, cy }`（cx/cy = bbox center），等价包一个绕同中心旋转的 Scope；
 *   scale number → `{ kind:'scale', x }`（等比，y 省略），`{x,y}` → `{ kind:'scale', x, y }`。
 *   缩放支点同为 bbox center：用 translate(center) ∘ scale ∘ translate(-center) 三段表达。两者都缺时返回空数组。
 *   数组顺序与 GroupPrim 渲染一致（array[0] 最外层、最后 apply）：先 rotate 段再 scale 段（rotate 在外）。
 */
export const buildPathTransforms = (
  rotate: number | undefined,
  scale: IRPathScale | undefined,
  center: IRPosition,
  round: (n: number) => number,
): Array<Transform> => {
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
