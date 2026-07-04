import { minimalEnclosingCircle } from '@retikz/math';

import type { BoundaryDefinition } from '../contract';
import type { Transform } from '../contract';
import type { ShapeDefinition } from '../contract';
import type { ProviderCollection } from '../providers/registry';
import type {
  IRAtPosition,
  IRBetweenPosition,
  IROffsetPosition,
  IRPosition,
  IRTransform,
  PolarPosition,
} from '../schemas';
import type { Rect } from '../shared/geometry';
import type { NameStack } from './name-stack';
import type { NodeLayout } from './node';
import type { ResolveBetweenGlobal } from './position';

import { resolveBoundaryRegistry } from '../providers/boundary';
import { providerDefinitionOf } from '../providers/registry';
import { resolveShapeRegistry } from '../providers/shape';
import { Anchor } from '../shared';
import { DEG_TO_RAD, RAD_TO_DEG, rect as rectOps } from '../shared/geometry';
import { boxInsets } from './node';
import { outerRectOf } from './node';
import { resolvePosition } from './position';

/** 把 IR transform 归一为 Scene transform；引用解析失败时返回 null。 */
export const lowerScopeTransforms = (
  transforms: ReadonlyArray<IRTransform>,
  nameStack: NameStack,
  nodeDistance?: number,
  resolveBetweenGlobal?: ResolveBetweenGlobal,
  onUnresolved?: (failed: IRTransform) => void,
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
        if (!resolved) {
          onUnresolved?.(t);
          return null;
        }
        out.push({ kind: 'translate', x: resolved[0], y: resolved[1] });
        break;
      }
      case 'at-translate': {
        const at: IRAtPosition = { direction: t.direction, of: t.of };
        if (t.distance !== undefined) at.distance = t.distance;
        const resolved = resolvePosition(at, nameStack, nodeDistance);
        if (!resolved) {
          onUnresolved?.(t);
          return null;
        }
        out.push({ kind: 'translate', x: resolved[0], y: resolved[1] });
        break;
      }
      case 'offset-translate': {
        const off: IROffsetPosition = {
          of: t.of,
          offset: t.offset ?? [0, 0],
        };
        const resolved = resolvePosition(off, nameStack, nodeDistance);
        if (!resolved) {
          onUnresolved?.(t);
          return null;
        }
        out.push({ kind: 'translate', x: resolved[0], y: resolved[1] });
        break;
      }
      case 'between-translate': {
        const between: IRBetweenPosition = { between: t.between, fraction: t.fraction };
        const resolved = resolvePosition(between, nameStack, nodeDistance, [], resolveBetweenGlobal);
        if (!resolved) {
          onUnresolved?.(t);
          return null;
        }
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

/** 把 scope 局部点投影到全局坐标。 */
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

/** 把全局坐标反投影回 scope 局部坐标。 */
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
        // scale 0 不可逆——退化为 (0, 0) 防 NaN（兜底手搓 IR 绕过 schema 的退化输入）；
        // ScaleSchema describe 已提醒用户避坑，此处运行时再守一道
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

/** 把 NodeLayout 投影到全局坐标系。 */
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

/** 收集一组 NodeLayout 的全局 4 角点（rotate-aware outerRect 四角），供 AABB / MEC 等包络复用 */
export const collectScopeCornerPoints = (layouts: ReadonlyArray<NodeLayout>): Array<IRPosition> => {
  const points: Array<IRPosition> = [];
  for (const layout of layouts) {
    const outerRect = outerRectOf(layout);
    points.push(
      rectOps.anchor(outerRect, Anchor.TopLeft),
      rectOps.anchor(outerRect, Anchor.TopRight),
      rectOps.anchor(outerRect, Anchor.BottomLeft),
      rectOps.anchor(outerRect, Anchor.BottomRight),
    );
  }
  return points;
};

/** 计算一组 layout 的全局 AABB；空数组返回 null。 */
export const computeScopeBoundingBox = (layouts: ReadonlyArray<NodeLayout>): ScopeBoundingBox | null => {
  if (layouts.length === 0) return null;
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  for (const [cx, cy] of collectScopeCornerPoints(layouts)) {
    if (cx < minX) minX = cx;
    if (cy < minY) minY = cy;
    if (cx > maxX) maxX = cx;
    if (cy > maxY) maxY = cy;
  }
  return { x: (minX + maxX) / 2, y: (minY + maxY) / 2, width: maxX - minX, height: maxY - minY };
};

/** 用 scope id 和 bbox 构造可引用的 synthetic rectangle layout。 */
export const registerScopeAsLayout = (
  id: string,
  bbox: ScopeBoundingBox | null,
  fallbackOrigin: IRPosition,
  shapes: ProviderCollection<ShapeDefinition> = resolveShapeRegistry(),
  boundaries: ProviderCollection<BoundaryDefinition> = resolveBoundaryRegistry(),
): NodeLayout => {
  const box: ScopeBoundingBox = bbox ?? { x: fallbackOrigin[0], y: fallbackOrigin[1], width: 0, height: 0 };
  return {
    id,
    shapeName: 'rectangle',
    shapeDef: providerDefinitionOf(shapes, 'rectangle', { capability: 'shape', optionName: 'shapes' }),
    rect: { x: box.x, y: box.y, width: box.width, height: box.height, rotate: 0 },
    contentCenter: [box.x, box.y],
    rotateDeg: 0,
    margin: boxInsets(0),
    textWidth: box.width,
    textHeight: box.height,
    align: 'middle',
    lineHeight: 0,
    fontSize: 0,
    shapes,
    boundaries,
  };
};

/** 用 scope id 和子树点集构造可引用的 synthetic circle layout。 */
export const registerScopeCircleLayout = (
  id: string,
  cornerPoints: ReadonlyArray<IRPosition>,
  fallbackOrigin: IRPosition,
  shapes: ProviderCollection<ShapeDefinition> = resolveShapeRegistry(),
  boundaries: ProviderCollection<BoundaryDefinition> = resolveBoundaryRegistry(),
): NodeLayout => {
  const mec = cornerPoints.length > 0 ? minimalEnclosingCircle([...cornerPoints]) : null;
  const center: IRPosition = mec ? [mec.center[0], mec.center[1]] : fallbackOrigin;
  const diameter = mec ? mec.radius * 2 : 0;
  return {
    id,
    shapeName: 'ellipse',
    shapeDef: providerDefinitionOf(shapes, 'ellipse', { capability: 'shape', optionName: 'shapes' }),
    shapeParams: { circumscribe: 'equal' },
    rect: { x: center[0], y: center[1], width: diameter, height: diameter, rotate: 0 },
    contentCenter: [center[0], center[1]],
    rotateDeg: 0,
    margin: boxInsets(0),
    textWidth: diameter,
    textHeight: diameter,
    align: 'middle',
    lineHeight: 0,
    fontSize: 0,
    shapes,
    boundaries,
  };
};
