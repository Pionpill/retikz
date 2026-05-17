import type { Rect } from '../geometry/rect';
import type {
  IRAtPosition,
  IROffsetPosition,
  IRPosition,
  IRTransform,
  PolarPosition,
} from '../ir';
import type { Transform } from '../primitive';
import type { NodeLayout } from './node';
import { resolvePosition } from './position';

/**
 * 把 IR 6 变体 transforms 展平为 Scene 3 变体（Cartesian translate / rotate / scale）
 * @description 4 个 translate 变体（translate / polar-translate / at-translate / offset-translate）
 *   各自构造对应 Position 字面量并调用 `resolvePosition` 拿到 Cartesian (x, y)，再写成 Cartesian translate；
 *   rotate / scale 直接透传。referent 未解析时返回 null（上游负责发 warn / throw）
 */
export const lowerScopeTransforms = (
  transforms: ReadonlyArray<IRTransform>,
  nodeIndex: Map<string, NodeLayout>,
  nodeDistance?: number,
): Array<Transform> | null => {
  const out: Array<Transform> = [];
  for (const t of transforms) {
    switch (t.kind) {
      case 'translate':
        out.push({ kind: 'translate', x: t.x, y: t.y });
        break;
      case 'polar-translate': {
        const polar: PolarPosition = { angle: t.angle, radius: t.radius };
        if (t.origin !== undefined) polar.origin = t.origin;
        const resolved = resolvePosition(polar, nodeIndex, nodeDistance);
        if (!resolved) return null;
        out.push({ kind: 'translate', x: resolved[0], y: resolved[1] });
        break;
      }
      case 'at-translate': {
        const at: IRAtPosition = { direction: t.direction, of: t.of };
        if (t.distance !== undefined) at.distance = t.distance;
        const resolved = resolvePosition(at, nodeIndex, nodeDistance);
        if (!resolved) return null;
        out.push({ kind: 'translate', x: resolved[0], y: resolved[1] });
        break;
      }
      case 'offset-translate': {
        const off: IROffsetPosition = {
          of: t.of,
          offset: t.offset ?? [0, 0],
        };
        const resolved = resolvePosition(off, nodeIndex, nodeDistance);
        if (!resolved) return null;
        out.push({ kind: 'translate', x: resolved[0], y: resolved[1] });
        break;
      }
      case 'rotate': {
        const r: Transform = { kind: 'rotate', degrees: t.degrees };
        if (t.cx !== undefined) r.cx = t.cx;
        if (t.cy !== undefined) r.cy = t.cy;
        out.push(r);
        break;
      }
      case 'scale': {
        const s: Transform = { kind: 'scale', x: t.x };
        if (t.y !== undefined) s.y = t.y;
        out.push(s);
        break;
      }
    }
  }
  return out;
};

/**
 * 把局部坐标点 (x, y) 按 Cartesian-only transform 链 apply 到全局坐标
 * @description 数组语义与 SVG `transform="t0 t1 t2"` / TikZ scope option 顺序一致：
 *   array[0] 是最外层（最后 apply 到 local），array[last] 是最内层（最先 apply）；
 *   即对局部点 P，结果 = t0(t1(t2(P)))。实现上从数组尾部往头部迭代依次 apply。
 *   只接受已被 `lowerScopeTransforms` 展平后的 3 变体（translate / rotate / scale）
 */
export const applyTransformChain = (
  local: IRPosition,
  chain: ReadonlyArray<Transform>,
): IRPosition => {
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
      const rad = (t.degrees * Math.PI) / 180;
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

/**
 * 复制 NodeLayout 并把 rect 中心点 + rotate + 尺寸全部按 scope transform chain 投到全局
 * @description rect 中心走 `applyTransformChain`；chain 里的 rotate 累加到 `rect.rotate`（弧度）、
 *   scale 乘进 rect.width / height / margin——这样 path 端点的 boundary clip 取的是与 SVG `<g>`
 *   实际渲染一致的视觉尺寸 / 朝向，跨 / 入 / 出 rotate / scale scope 的 path 都贴节点视觉边界。
 *   非均匀 scale 与 rotate 在 chain 中混合时，按"累加 rotate + 分量相乘 scale"近似（uniform scale 精确，
 *   anisotropic + rotate 的剪切耦合不展开——alpha 阶段限制）。
 */
export const projectLayoutToGlobal = (
  layout: NodeLayout,
  chain: ReadonlyArray<Transform>,
): NodeLayout => {
  const [gx, gy] = applyTransformChain([layout.rect.x, layout.rect.y], chain);
  let rotateAccumRad = 0;
  let scaleX = 1;
  let scaleY = 1;
  for (const t of chain) {
    if (t.kind === 'rotate') {
      rotateAccumRad += (t.degrees * Math.PI) / 180;
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
    width: layout.rect.width * scaleX,
    height: layout.rect.height * scaleY,
  };
  const marginScale = Math.max(Math.abs(scaleX), Math.abs(scaleY));
  return { ...layout, rect: globalRect, margin: layout.margin * marginScale };
};
