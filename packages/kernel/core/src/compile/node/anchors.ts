import type { JsonObject } from '@retikz/foundation';
import type { BoundsInsets, Position } from '@retikz/math';
import { point } from '@retikz/math';

import { RetikzCoreError, RetikzCoreErrorCode } from '../../error';
import type { BoundaryReferenceResolution, NodeReferenceView } from '../../resolve';
import type { IRBoundary } from '../../schemas';
import type { Rect } from '../../shared/geometry';
import type { NodeLayout } from './types';

type NodeAnchorLayout = NodeLayout | NodeReferenceView;

import { boundaryKey } from '../../resolve';
import { CenterAnchor, isAnchor } from '../../shared';
import { DEG_TO_RAD } from '../../shared/geometry';
import { snapshotProviderPosition } from '../scene-primitive';
import { fallbackBoundaryAnchor, resolveBoundary as resolveBoundaryGeometry } from './boundary';

/** 空 shape params */
const EMPTY_SHAPE_PARAMS: JsonObject = {};

/** 保留合法 undefined fallback，并校验 provider 实际返回的二维坐标 */
const snapshotOptionalProviderPosition = (owner: string, value: unknown): Position | undefined =>
  value === undefined ? undefined : snapshotProviderPosition(owner, value);

const isZeroInsets = (m: BoundsInsets): boolean => m.top === 0 && m.right === 0 && m.bottom === 0 && m.left === 0;

/** 按 rect 局部坐标系四边外扩，非对称外扩会移动外边界中心 */
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

/** 取节点视觉 rect 外扩 margin 后的外边界 */
export const outerRectOf = (layout: NodeLayout): Rect => inflateRect(layout.rect, layout.margin);

const shapeBoundaryResolutionOf = (layout: NodeAnchorLayout): BoundaryReferenceResolution => ({
  name: layout.shapeName,
  definition: layout.shapeDef,
  params: layout.shapeParams ?? EMPTY_SHAPE_PARAMS,
  isShape: true,
});

const resolveBoundaryOf = (
  layout: NodeAnchorLayout,
  boundary: IRBoundary | undefined,
  boundaryResolution?: BoundaryReferenceResolution,
  warn?: (code: string, message: string) => void,
) => {
  const resolution =
    boundaryResolution ??
    (boundary === undefined || boundary === 'shape'
      ? shapeBoundaryResolutionOf(layout)
      : boundary === layout.boundary || boundaryKey(boundary) === boundaryKey(layout.boundary)
        ? layout.boundaryResolution
        : undefined);
  if (resolution === undefined) {
    throw new RetikzCoreError(
      RetikzCoreErrorCode.Compile,
      `Boundary '${boundaryKey(boundary)}' was not resolved for node '${layout.id ?? '(unnamed)'}'`,
    );
  }

  return resolveBoundaryGeometry(resolution, {
    visualDef: layout.shapeDef,
    visualRect: layout.rect,
    visualParams: layout.shapeParams ?? EMPTY_SHAPE_PARAMS,
    irPath: layout.irPath,
    ...('connectionEnvelopeCache' in layout && layout.connectionEnvelopeCache !== undefined
      ? { connectionEnvelopeCache: layout.connectionEnvelopeCache }
      : {}),
    ...('connectionEnvelopeWarnings' in layout && layout.connectionEnvelopeWarnings !== undefined
      ? { connectionEnvelopeWarnings: layout.connectionEnvelopeWarnings }
      : {}),
    ...('warn' in layout && layout.warn !== undefined ? { warn: layout.warn } : warn === undefined ? {} : { warn }),
  });
};

/** 取节点 shape 在 toward 方向的附着点 */
export const boundaryPointOf = (
  layout: NodeAnchorLayout,
  toward: Position,
  boundary?: IRBoundary,
  boundaryResolution?: BoundaryReferenceResolution,
  warn?: (code: string, message: string) => void,
): Position => {
  const { def, rect, params } = resolveBoundaryOf(layout, boundary, boundaryResolution, warn);
  const raw = def.boundaryPoint(inflateRect(rect, layout.margin), toward, params);
  return snapshotProviderPosition(`Boundary '${boundaryKey(boundary)}' boundaryPoint`, raw);
};

/** 沿折线移除起始节点连接面内的前缀，保留原线段上的出界交点 */
export const clipNodePolyline = (
  layout: NodeAnchorLayout,
  points: ReadonlyArray<Position>,
  boundary?: IRBoundary,
  boundaryResolution?: BoundaryReferenceResolution,
  warn?: (code: string, message: string) => void,
): Array<Position> => {
  const { def, rect, params } = resolveBoundaryOf(layout, boundary, boundaryResolution, warn);
  const outer = inflateRect(rect, layout.margin);
  const center: Position = [outer.x, outer.y];
  const boundaryAt = (position: Position): Position =>
    snapshotProviderPosition(
      `Boundary '${boundaryKey(boundary)}' boundaryPoint`,
      def.boundaryPoint(outer, position, params),
    );
  const contains = (position: Position): boolean =>
    point.isEqual(position, center) || point.distance(center, position) <= point.distance(center, boundaryAt(position));

  for (let index = 0; index < points.length; index += 1) {
    const outside = points[index];
    if (contains(outside)) continue;
    if (index === 0) return [...points];
    if (point.isEqual(points[index - 1], center)) return [boundaryAt(outside), ...points.slice(index)];

    // 沿原线段求内外分界，避免改用中心射线后破坏正交方向
    let inside = points[index - 1];
    let edge = outside;
    for (let iteration = 0; iteration < 48; iteration += 1) {
      const midpoint: Position = [(inside[0] + edge[0]) / 2, (inside[1] + edge[1]) / 2];
      if (contains(midpoint)) inside = midpoint;
      else edge = midpoint;
    }
    return [edge, ...points.slice(index)];
  }

  return [];
};

/** 取节点 shape 的命名 anchor；标准 anchor 可选在 boundary 拟合后应用 margin */
export const anchorOf = (
  layout: NodeAnchorLayout,
  name: string,
  boundary?: IRBoundary,
  applyMargin = false,
  boundaryResolution?: BoundaryReferenceResolution,
): Position => {
  if (isAnchor(name)) {
    if (name === CenterAnchor.Center) {
      const own = snapshotOptionalProviderPosition(
        `Shape '${layout.shapeName}' anchor`,
        layout.shapeDef.anchor(layout.rect, CenterAnchor.Center, layout.shapeParams ?? EMPTY_SHAPE_PARAMS),
      );
      return own ?? [layout.rect.x, layout.rect.y];
    }

    // 标准方位名优先走视觉 shape 自身 anchor；未实现时回退外接 AABB。
    if (boundary === 'shape') {
      const shapeRect = applyMargin ? inflateRect(layout.rect, layout.margin) : layout.rect;
      const own = snapshotOptionalProviderPosition(
        `Shape '${layout.shapeName}' anchor`,
        layout.shapeDef.anchor(shapeRect, name, layout.shapeParams ?? EMPTY_SHAPE_PARAMS),
      );
      if (own !== undefined) return own;

      const fallbackRect = applyMargin ? inflateRect(layout.rect, layout.margin) : layout.rect;
      const p = fallbackBoundaryAnchor(fallbackRect, name);
      if (p === undefined)
        throw new RetikzCoreError(
          RetikzCoreErrorCode.Compile,
          `Unknown anchor '${name}' for shape '${layout.shapeName}'`,
        );

      return p;
    }

    const { def, rect, params } = resolveBoundaryOf(layout, boundary, boundaryResolution);
    const anchorRect = applyMargin ? inflateRect(rect, layout.margin) : rect;
    const raw = def.anchor?.(anchorRect, name, params);
    const p =
      snapshotOptionalProviderPosition(`Boundary '${boundaryKey(boundary)}' anchor`, raw) ??
      fallbackBoundaryAnchor(anchorRect, name);
    if (p === undefined)
      throw new RetikzCoreError(
        RetikzCoreErrorCode.Compile,
        `Unknown anchor '${name}' for shape '${layout.shapeName}'`,
      );

    return p;
  }

  // 形状专属命名 anchor 恒走视觉形状。
  const p = snapshotOptionalProviderPosition(
    `Shape '${layout.shapeName}' anchor`,
    layout.shapeDef.anchor(layout.rect, name, layout.shapeParams ?? EMPTY_SHAPE_PARAMS),
  );
  if (p === undefined) {
    throw new RetikzCoreError(RetikzCoreErrorCode.Compile, `Unknown anchor '${name}' for shape '${layout.shapeName}'`);
  }

  return p;
};

/** 取节点 shape 在指定角度方向的边界点 */
export const angleBoundaryOf = (
  layout: NodeAnchorLayout,
  angleDeg: number,
  boundary?: IRBoundary,
  applyMargin = false,
  boundaryResolution?: BoundaryReferenceResolution,
): Position => {
  const rad = angleDeg * DEG_TO_RAD;
  const lx = Math.cos(rad);
  const ly = Math.sin(rad);
  const { def, rect, params } = resolveBoundaryOf(layout, boundary, boundaryResolution);
  const boundaryRect = applyMargin ? inflateRect(rect, layout.margin) : rect;
  const rot = boundaryRect.rotate ?? 0;
  const cosR = Math.cos(rot);
  const sinR = Math.sin(rot);

  // 局部方向转为世界方向。
  const toward: Position = [boundaryRect.x + lx * cosR - ly * sinR, boundaryRect.y + lx * sinR + ly * cosR];
  const raw = def.boundaryPoint(boundaryRect, toward, params);

  return snapshotProviderPosition(`Boundary '${boundaryKey(boundary)}' boundaryPoint`, raw);
};
