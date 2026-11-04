import type { BoundsInsets, CenteredBox, Position } from '@retikz/math';
import { DEG_TO_RAD, point } from '@retikz/math';

import { RetikzCoreError, RetikzCoreErrorCode } from '../../error';
import type { CanonicalNodeBoundary } from '../../resolve';
import { boundaryKey } from '../../resolve';
import type { IRBoundary } from '../../schemas';
import { CenterAnchor, isAnchor } from '../../shared';
import type { CompiledBoundaryGeometry } from '../reference';
import { snapshotProviderPosition } from '../shared';
import { fallbackBoundaryAnchor, resolveBoundary as resolveBoundaryGeometry } from './boundary';
import type { NodeBoundaryState } from './types';

/** 保留合法 undefined fallback，并校验 provider 实际返回的二维坐标 */
const snapshotOptionalProviderPosition = (owner: string, value: Position | undefined): Position | undefined =>
  value === undefined ? undefined : snapshotProviderPosition(owner, value);

const isZeroInsets = (m: BoundsInsets): boolean => m.top === 0 && m.right === 0 && m.bottom === 0 && m.left === 0;

/** 按 rect 局部坐标系四边外扩，非对称外扩会移动外边界中心 */
const inflateRect = (r: CenteredBox, m: BoundsInsets): CenteredBox => {
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
export const outerRectOf = (layout: Pick<CompiledBoundaryGeometry, 'geometry'>): CenteredBox =>
  inflateRect(layout.geometry.rect, layout.geometry.margin);

const shapeBoundaryResolutionOf = (layout: CompiledBoundaryGeometry): CanonicalNodeBoundary => ({
  name: layout.shape.name,
  definition: layout.shape.definition,
  params: layout.shape.params,
  isShape: true,
});

const resolveBoundaryOf = (
  layout: CompiledBoundaryGeometry,
  boundary: IRBoundary | undefined,
  canonicalBoundary?: CanonicalNodeBoundary,
  warn?: (code: string, message: string) => void,
  state?: NodeBoundaryState,
) => {
  const resolution =
    canonicalBoundary ??
    (boundary === 'shape'
      ? shapeBoundaryResolutionOf(layout)
      : boundary === undefined ||
          boundary === layout.boundary.name ||
          boundaryKey(boundary) === boundaryKey({ type: layout.boundary.name, params: layout.boundary.params })
        ? layout.boundary
        : undefined);
  if (resolution === undefined) {
    throw new RetikzCoreError(
      RetikzCoreErrorCode.Compile,
      `Boundary '${boundaryKey(boundary)}' was not resolved for shape '${layout.shape.name}'`,
    );
  }

  return resolveBoundaryGeometry(
    resolution,
    { def: layout.shape.definition, rect: layout.geometry.rect, params: layout.shape.params },
    { ...state, warn: state?.warn ?? warn },
  );
};

/** 取节点 shape 在 toward 方向的附着点 */
export const boundaryPointOf = (
  layout: CompiledBoundaryGeometry,
  toward: Position,
  boundary?: IRBoundary,
  canonicalBoundary?: CanonicalNodeBoundary,
  warn?: (code: string, message: string) => void,
  state?: NodeBoundaryState,
): Position => {
  const { def, rect, params } = resolveBoundaryOf(layout, boundary, canonicalBoundary, warn, state);
  const raw = def.computeBoundaryPoint(inflateRect(rect, layout.geometry.margin), toward, params);
  return snapshotProviderPosition(`Boundary '${boundaryKey(boundary)}' boundaryPoint`, raw);
};

/** 沿折线移除起始节点连接面内的前缀，保留原线段上的出界交点 */
export const clipNodePolyline = (
  layout: CompiledBoundaryGeometry,
  points: ReadonlyArray<Position>,
  boundary?: IRBoundary,
  canonicalBoundary?: CanonicalNodeBoundary,
  warn?: (code: string, message: string) => void,
  state?: NodeBoundaryState,
): Array<Position> => {
  const { def, rect, params } = resolveBoundaryOf(layout, boundary, canonicalBoundary, warn, state);
  const outer = inflateRect(rect, layout.geometry.margin);
  const center: Position = [outer.x, outer.y];
  const boundaryAt = (position: Position): Position =>
    snapshotProviderPosition(
      `Boundary '${boundaryKey(boundary)}' boundaryPoint`,
      def.computeBoundaryPoint(outer, position, params),
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
  layout: CompiledBoundaryGeometry,
  name: string,
  boundary?: IRBoundary,
  applyMargin = false,
  canonicalBoundary?: CanonicalNodeBoundary,
  state?: NodeBoundaryState,
): Position => {
  if (isAnchor(name)) {
    if (name === CenterAnchor.Center) {
      const own = snapshotOptionalProviderPosition(
        `Shape '${layout.shape.name}' anchor`,
        layout.shape.definition.resolveAnchor(layout.geometry.rect, CenterAnchor.Center, layout.shape.params),
      );
      return own ?? [layout.geometry.rect.x, layout.geometry.rect.y];
    }

    // 标准方位名优先走视觉 shape 自身 anchor；未实现时回退外接 AABB。
    if (boundary === 'shape') {
      const shapeRect = applyMargin ? inflateRect(layout.geometry.rect, layout.geometry.margin) : layout.geometry.rect;
      const own = snapshotOptionalProviderPosition(
        `Shape '${layout.shape.name}' anchor`,
        layout.shape.definition.resolveAnchor(shapeRect, name, layout.shape.params),
      );
      if (own !== undefined) return own;

      const fallbackRect = applyMargin
        ? inflateRect(layout.geometry.rect, layout.geometry.margin)
        : layout.geometry.rect;
      const p = fallbackBoundaryAnchor(fallbackRect, name);
      if (p === undefined)
        throw new RetikzCoreError(
          RetikzCoreErrorCode.Compile,
          `Unknown anchor '${name}' for shape '${layout.shape.name}'`,
        );

      return p;
    }

    const { def, rect, params } = resolveBoundaryOf(layout, boundary, canonicalBoundary, undefined, state);
    const anchorRect = applyMargin ? inflateRect(rect, layout.geometry.margin) : rect;
    const raw = def.resolveAnchor?.(anchorRect, name, params);
    const p =
      snapshotOptionalProviderPosition(`Boundary '${boundaryKey(boundary)}' anchor`, raw) ??
      fallbackBoundaryAnchor(anchorRect, name);
    if (p === undefined)
      throw new RetikzCoreError(
        RetikzCoreErrorCode.Compile,
        `Unknown anchor '${name}' for shape '${layout.shape.name}'`,
      );

    return p;
  }

  // 形状专属命名 anchor 恒走视觉形状。
  const p = snapshotOptionalProviderPosition(
    `Shape '${layout.shape.name}' anchor`,
    layout.shape.definition.resolveAnchor(layout.geometry.rect, name, layout.shape.params),
  );
  if (p === undefined) {
    throw new RetikzCoreError(RetikzCoreErrorCode.Compile, `Unknown anchor '${name}' for shape '${layout.shape.name}'`);
  }

  return p;
};

/** 取节点 shape 在指定角度方向的边界点 */
export const angleBoundaryOf = (
  layout: CompiledBoundaryGeometry,
  angleDeg: number,
  boundary?: IRBoundary,
  applyMargin = false,
  canonicalBoundary?: CanonicalNodeBoundary,
  state?: NodeBoundaryState,
): Position => {
  const rad = angleDeg * DEG_TO_RAD;
  const lx = Math.cos(rad);
  const ly = Math.sin(rad);
  const { def, rect, params } = resolveBoundaryOf(layout, boundary, canonicalBoundary, undefined, state);
  const boundaryRect = applyMargin ? inflateRect(rect, layout.geometry.margin) : rect;
  const rot = boundaryRect.rotate ?? 0;
  const cosR = Math.cos(rot);
  const sinR = Math.sin(rot);

  // 局部方向转为世界方向。
  const toward: Position = [boundaryRect.x + lx * cosR - ly * sinR, boundaryRect.y + lx * sinR + ly * cosR];
  const raw = def.computeBoundaryPoint(boundaryRect, toward, params);

  return snapshotProviderPosition(`Boundary '${boundaryKey(boundary)}' boundaryPoint`, raw);
};
