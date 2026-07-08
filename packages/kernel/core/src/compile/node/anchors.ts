import type { BoundsInsets, Position } from '@retikz/math';

import type { IRBoundary, IRJsonObject } from '../../schemas';
import type { Rect } from '../../shared/geometry';
import type { ResolveBoundaryContext } from './boundary';
import type { NodeLayout } from './types';

import { resolveBoundaryRegistry } from '../../providers/boundary';
import { CenterAnchor, isAnchor } from '../../shared';
import { DEG_TO_RAD } from '../../shared/geometry';
import { fallbackBoundaryAnchor, resolveBoundary } from './boundary';

/** 空 shape params。 */
const EMPTY_SHAPE_PARAMS: IRJsonObject = {};

const isZeroInsets = (m: BoundsInsets): boolean => m.top === 0 && m.right === 0 && m.bottom === 0 && m.left === 0;

/** 按 rect 局部坐标系四边外扩，非对称外扩会移动外边界中心。 */
const inflateRect = (r: Rect, m: BoundsInsets): Rect => {
  if (isZeroInsets(m)) return r;
  const dx = (m.right - m.left) / 2;
  const dy = (m.bottom - m.top) / 2;
  const rot = r.rotate ?? 0;
  const cos = Math.cos(rot);
  const sin = Math.sin(rot);
  return {
    x: r.x + dx * cos - dy * sin,
    y: r.y + dx * sin + dy * cos,
    width: r.width + m.left + m.right,
    height: r.height + m.top + m.bottom,
    rotate: r.rotate,
  };
};

/** 取节点视觉 rect 外扩 margin 后的外边界。 */
export const outerRectOf = (layout: NodeLayout): Rect => inflateRect(layout.rect, layout.margin);

const boundaryContextOf = (layout: NodeLayout): ResolveBoundaryContext => ({
  visualDef: layout.shapeDef,
  visualRect: layout.rect,
  visualParams: layout.shapeParams ?? EMPTY_SHAPE_PARAMS,
  shapeRegistry: layout.shapes,
  boundaryRegistry: layout.boundaries ?? resolveBoundaryRegistry(),
  irPath: layout.irPath,
});

/** 取节点 shape 在 toward 方向的附着点。 */
export const boundaryPointOf = (
  layout: NodeLayout,
  toward: Position,
  boundary: IRBoundary | undefined = 'shape',
): Position => {
  const { def, rect, params } = resolveBoundary(boundary, boundaryContextOf(layout));
  return def.boundaryPoint(inflateRect(rect, layout.margin), toward, params);
};

/** 取节点 shape 的命名 anchor。 */
export const anchorOf = (layout: NodeLayout, name: string, boundary: IRBoundary | undefined = 'shape'): Position => {
  if (isAnchor(name)) {
    if (name === CenterAnchor.Center) {
      const own = layout.shapeDef.anchor(layout.rect, CenterAnchor.Center, layout.shapeParams ?? EMPTY_SHAPE_PARAMS);
      return own ?? [layout.rect.x, layout.rect.y];
    }

    // 标准方位名优先走视觉 shape 自身 anchor；未实现时回退外接 AABB。
    if (boundary === 'shape') {
      const own = layout.shapeDef.anchor(layout.rect, name, layout.shapeParams ?? EMPTY_SHAPE_PARAMS);
      if (own !== undefined) return own;
      const fallback = resolveBoundary('rectangle', boundaryContextOf(layout));
      const p = fallback.def.anchor?.(fallback.rect, name, fallback.params);
      if (p === undefined) throw new Error(`Unknown anchor '${name}' for shape '${layout.shapeName}'`);
      return p;
    }
    const { def, rect, params } = resolveBoundary(boundary, boundaryContextOf(layout));
    const p = def.anchor?.(rect, name, params) ?? fallbackBoundaryAnchor(rect, name);
    if (p === undefined) throw new Error(`Unknown anchor '${name}' for shape '${layout.shapeName}'`);
    return p;
  }
  // 形状专属命名 anchor 恒走视觉形状。
  const p = layout.shapeDef.anchor(layout.rect, name, layout.shapeParams ?? EMPTY_SHAPE_PARAMS);
  if (p === undefined) {
    throw new Error(`Unknown anchor '${name}' for shape '${layout.shapeName}'`);
  }
  return p;
};

/** 取节点 shape 在指定角度方向的边界点。 */
export const angleBoundaryOf = (
  layout: NodeLayout,
  angleDeg: number,
  boundary: IRBoundary | undefined = 'shape',
): Position => {
  const rad = angleDeg * DEG_TO_RAD;
  const lx = Math.cos(rad);
  const ly = Math.sin(rad);
  const rot = layout.rect.rotate ?? 0;
  const cosR = Math.cos(rot);
  const sinR = Math.sin(rot);
  // 局部方向转为世界方向。
  const toward: Position = [layout.rect.x + lx * cosR - ly * sinR, layout.rect.y + lx * sinR + ly * cosR];
  const { def, rect, params } = resolveBoundary(boundary, boundaryContextOf(layout));
  return def.boundaryPoint(rect, toward, params);
};
