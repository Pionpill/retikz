import type { Transform } from '../contract';
import type { IRPosition } from '../schemas';
import type { Rect } from '../shared/geometry';
import type { NodeLayout } from './node';

import { DEG_TO_RAD, RAD_TO_DEG } from '../shared/geometry';

/** 将局部点按 transform chain 投影到全局坐标 */
export const applyTransformChain = (local: IRPosition, chain: ReadonlyArray<Transform>): IRPosition => {
  let x = local[0];
  let y = local[1];
  for (let i = chain.length - 1; i >= 0; i--) {
    const t = chain[i];
    if (t.kind === 'translate') {
      x += t.x;
      y += t.y;
    } else if (t.kind === 'rotate') {
      const cx = t.cx ?? 0;
      const cy = t.cy ?? 0;
      const rad = t.degrees * DEG_TO_RAD;
      const cos = Math.cos(rad);
      const sin = Math.sin(rad);
      const dx = x - cx;
      const dy = y - cy;
      x = cx + dx * cos - dy * sin;
      y = cy + dx * sin + dy * cos;
    } else {
      const sy = t.y ?? t.x;
      x *= t.x;
      y *= sy;
    }
  }
  return [x, y];
};

/** 将全局点反投影回当前 transform chain 的局部坐标 */
export const inverseTransformChain = (global: IRPosition, chain: ReadonlyArray<Transform>): IRPosition => {
  let x = global[0];
  let y = global[1];
  for (const t of chain) {
    if (t.kind === 'translate') {
      x -= t.x;
      y -= t.y;
    } else if (t.kind === 'rotate') {
      const cx = t.cx ?? 0;
      const cy = t.cy ?? 0;
      const rad = -t.degrees * DEG_TO_RAD;
      const cos = Math.cos(rad);
      const sin = Math.sin(rad);
      const dx = x - cx;
      const dy = y - cy;
      x = cx + dx * cos - dy * sin;
      y = cy + dx * sin + dy * cos;
    } else {
      const sy = t.y ?? t.x;
      if (t.x === 0 || sy === 0) {
        x = 0;
        y = 0;
        continue;
      }
      x /= t.x;
      y /= sy;
    }
  }
  return [x, y];
};

/** 将 NodeLayout 投影到全局坐标系 */
export const projectLayoutToGlobal = (layout: NodeLayout, chain: ReadonlyArray<Transform>): NodeLayout => {
  const [gx, gy] = applyTransformChain([layout.rect.x, layout.rect.y], chain);
  let rotateAccumRad = 0;
  let scaleX = 1;
  let scaleY = 1;
  for (const t of chain) {
    if (t.kind === 'rotate') {
      rotateAccumRad += t.degrees * DEG_TO_RAD;
    } else if (t.kind === 'scale') {
      scaleX *= t.x;
      scaleY *= t.y ?? t.x;
    }
  }
  const globalRect: Rect = {
    ...layout.rect,
    x: gx,
    y: gy,
    rotate: (layout.rect.rotate ?? 0) + rotateAccumRad,
    width: layout.rect.width * Math.abs(scaleX),
    height: layout.rect.height * Math.abs(scaleY),
  };
  return {
    ...layout,
    rect: globalRect,
    rotateDeg: layout.rotateDeg + rotateAccumRad * RAD_TO_DEG,
    margin: {
      top: layout.margin.top * Math.abs(scaleY),
      right: layout.margin.right * Math.abs(scaleX),
      bottom: layout.margin.bottom * Math.abs(scaleY),
      left: layout.margin.left * Math.abs(scaleX),
    },
  };
};
