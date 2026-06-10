import { type Rect, rect as rectOps } from '../geometry/rect';
import type {
  IRAtPosition,
  IRBetweenPosition,
  IROffsetPosition,
  IRPosition,
  IRTransform,
  PolarPosition,
} from '../ir';
import type { Transform } from '../primitive';
import { BUILTIN_SHAPES } from '../shapes';
import type { ShapeDefinition } from '../shapes';
import type { NameStack } from './name-stack';
import type { NodeLayout } from './node';
import { type ResolveBetweenGlobal, resolvePosition } from './position';

/**
 * 把 IR 7 变体 transforms 展平为 Scene 3 变体（Cartesian translate / rotate / scale）
 * @description 5 个 translate 变体（translate / polar-translate / at-translate / offset-translate / between-translate）
 *   各自构造对应 Position 字面量并调用 `resolvePosition` 拿到 Cartesian (x, y)，再写成 Cartesian translate；
 *   rotate / scale 直接透传。referent 未解析时返回 null（上游负责发 warn / throw）
 */
export const lowerScopeTransforms = (
  transforms: ReadonlyArray<IRTransform>,
  nameStack: NameStack,
  nodeDistance?: number,
  resolveBetweenGlobal?: ResolveBetweenGlobal,
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
        const resolved = resolvePosition(polar, nameStack, nodeDistance);
        if (!resolved) return null;
        out.push({ kind: 'translate', x: resolved[0], y: resolved[1] });
        break;
      }
      case 'at-translate': {
        const at: IRAtPosition = { direction: t.direction, of: t.of };
        if (t.distance !== undefined) at.distance = t.distance;
        const resolved = resolvePosition(at, nameStack, nodeDistance);
        if (!resolved) return null;
        out.push({ kind: 'translate', x: resolved[0], y: resolved[1] });
        break;
      }
      case 'offset-translate': {
        const off: IROffsetPosition = {
          of: t.of,
          offset: t.offset ?? [0, 0],
        };
        const resolved = resolvePosition(off, nameStack, nodeDistance);
        if (!resolved) return null;
        out.push({ kind: 'translate', x: resolved[0], y: resolved[1] });
        break;
      }
      case 'between-translate': {
        const between: IRBetweenPosition = { between: t.between, t: t.t };
        const resolved = resolvePosition(between, nameStack, nodeDistance, [], resolveBetweenGlobal);
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
 * 把全局坐标点反向投影回 scope 局部坐标系（`applyTransformChain` 的逆）
 * @description chain = [t0, t1, t2]（array[0] 最外层、最后 apply）的逆 =
 *   按数组正序应用每个 transform 的逆：t0^-1 / t1^-1 / t2^-1。
 *   translate(-x, -y) / rotate(-deg, cx, cy) / scale(1/x, 1/y)。
 *   scale 分量为 0 时反向投影未定义——退化为返回原点 (0, 0) 当前层，避免 NaN 污染下游。
 *   作用：referent 全局点 → 当前 scope 局部坐标系，配合 `applyTransformChain` 实现
 *   "referent 全局 + relative 部分在当前 scope 局部度量 + 末端正向投影回全局" 的语义。
 */
export const inverseTransformChain = (
  global: IRPosition,
  chain: ReadonlyArray<Transform>,
): IRPosition => {
  let x = global[0];
  let y = global[1];
  for (const t of chain) {
    if (t.kind === 'translate') {
      x -= t.x;
      y -= t.y;
    } else if (t.kind === 'rotate') {
      const cx = t.cx ?? 0;
      const cy = t.cy ?? 0;
      const rad = (-t.degrees * Math.PI) / 180;
      const cos = Math.cos(rad);
      const sin = Math.sin(rad);
      const dx = x - cx;
      const dy = y - cy;
      x = cx + dx * cos - dy * sin;
      y = cy + dx * sin + dy * cos;
    } else {
      const sy = t.y ?? t.x;
      if (t.x === 0 || sy === 0) {
        // scale 0 不可逆——退化为 (0, 0) 防 NaN
        // schema 层不强制拒 scale=0（zod 3 discriminatedUnion 不支持 .refine），
        // 仅 ScaleSchema describe 提醒用户避坑；运行时退化为 (0, 0) 防 NaN
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
    width: layout.rect.width * Math.abs(scaleX),
    height: layout.rect.height * Math.abs(scaleY),
  };
  const marginScale = Math.max(Math.abs(scaleX), Math.abs(scaleY));
  return {
    ...layout,
    rect: globalRect,
    rotateDeg: layout.rotateDeg + rotateAccumRad * (180 / Math.PI),
    margin: layout.margin * marginScale,
  };
};

/** scope bbox 计算结果：bbox 几何中心 + 尺寸（width/height ≥ 0；空 scope 退化为 0×0 占位时仍合法） */
export type ScopeBoundingBox = {
  /** bbox 几何中心 x（全局坐标） */
  x: number;
  /** bbox 几何中心 y（全局坐标） */
  y: number;
  /** bbox 宽度（≥ 0；空 scope / 单点退化为 0） */
  width: number;
  /** bbox 高度（≥ 0；空 scope / 单点退化为 0） */
  height: number;
};

/**
 * 收集一组 NodeLayout 的全局 axis-aligned bounding box
 * @description 每个 layout 的 4 角点已是全局坐标系（Pass 1 累积 chain apply 后），
 *   取每个 layout 的 rotate-aware `north-west` / `north-east` / `south-west` / `south-east`
 *   4 角点（rect.anchor 已含 layout.rect.rotate 处理）并求 AABB；
 *   layout 是 0×0（coordinate / 空 scope 占位）时退化为单点也合法；
 *   空 layouts 数组返回 null（调用方按"empty scope + fallback origin"退化为 0×0 占位）
 */
export const computeScopeBoundingBox = (
  layouts: ReadonlyArray<NodeLayout>,
): ScopeBoundingBox | null => {
  if (layouts.length === 0) return null;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const layout of layouts) {
    // 4 角点取 rotate-aware 投影后的全局坐标——rect.anchor 已包含 rect.rotate
    const corners: ReadonlyArray<IRPosition> = [
      rectOps.anchor(layout.rect, 'north-west'),
      rectOps.anchor(layout.rect, 'north-east'),
      rectOps.anchor(layout.rect, 'south-west'),
      rectOps.anchor(layout.rect, 'south-east'),
    ];
    for (const [cx, cy] of corners) {
      if (cx < minX) minX = cx;
      if (cy < minY) minY = cy;
      if (cx > maxX) maxX = cx;
      if (cy > maxY) maxY = cy;
    }
  }
  return {
    x: (minX + maxX) / 2,
    y: (minY + maxY) / 2,
    width: maxX - minX,
    height: maxY - minY,
  };
};

/**
 * 用 scope id + bbox 构造 synthetic rectangle NodeLayout
 * @description bbox 为 null 时退化为 fallbackOrigin 的 0×0 占位（空 scope 仍要有可引用句柄）。
 *   synthetic layout 完全复用 rectangle 路径：`scope.id.<keyword>` / `scope.id.<deg>` / `scope.id` 作为 referent
 *   走与普通 rectangle Node 完全一致的 anchorOf / boundaryPointOf / 中心点取值
 */
export const registerScopeAsLayout = (
  id: string,
  bbox: ScopeBoundingBox | null,
  fallbackOrigin: IRPosition,
  shapes: Record<string, ShapeDefinition> = BUILTIN_SHAPES,
): NodeLayout => {
  const box: ScopeBoundingBox =
    bbox ?? { x: fallbackOrigin[0], y: fallbackOrigin[1], width: 0, height: 0 };
  return {
    id,
    shapeName: 'rectangle',
    shapeDef: shapes.rectangle,
    rect: { x: box.x, y: box.y, width: box.width, height: box.height, rotate: 0 },
    rotateDeg: 0,
    margin: 0,
    textWidth: box.width,
    textHeight: box.height,
    align: 'middle',
    lineHeight: 0,
    fontSize: 0,
    shapes,
  };
};
