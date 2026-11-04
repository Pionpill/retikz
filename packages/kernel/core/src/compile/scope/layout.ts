import type { CenteredBox } from '@retikz/math';
import { boundsOf, centerOfBounds, circle } from '@retikz/math';

import type { Transform } from '../../contract';
import type { CanonicalScope } from '../../resolve';
import type { IRPosition, IRScope } from '../../schemas';
import { ScopeBoundingShape } from '../../schemas';
import { Anchor } from '../../shared';
import { rect as rectOps } from '../../shared/geometry';
import { outerRectOf } from '../node';
import type { BoundaryGeometryContext } from '../reference';
import { projectReferenceGeometry } from '../reference';
import type { ReferenceGeometryContext } from '../reference';
import { composeScopeTransform } from '../shared';
import type { CompiledScopeGeometry } from './types';

/** 收集一组 NodeGeometryContext 的全局 4 角点，供 AABB / MEC 等包络复用 */
export const collectScopeCornerPoints = (layouts: ReadonlyArray<ReferenceGeometryContext>): Array<IRPosition> => {
  const points: Array<IRPosition> = [];

  for (const layout of layouts) {
    if ('position' in layout) {
      points.push(layout.position);
      continue;
    }
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

/** 计算一组 layout 的全局 AABB；空数组返回 null */
export const computeScopeBoundingBox = (layouts: ReadonlyArray<ReferenceGeometryContext>): CenteredBox | null => {
  const bounds = boundsOf(collectScopeCornerPoints(layouts));
  if (bounds === undefined) return null;

  const center = centerOfBounds(bounds);

  return { x: center[0], y: center[1], width: bounds.maxX - bounds.minX, height: bounds.maxY - bounds.minY };
};

/** 从真实子布局聚合 rectangle / circle 包络，不经过节点解析或文字测量 */
export const createIntrinsicScopeLayout = (
  canon: CanonicalScope,
  scopeLayouts: ReadonlyArray<ReferenceGeometryContext>,
): CompiledScopeGeometry => {
  let rect: CenteredBox;
  if (canon.envelope.kind === ScopeBoundingShape.Circle) {
    const points = collectScopeCornerPoints(scopeLayouts);
    const envelope = points.length === 0 ? undefined : circle.minimalEnclosing(points);
    rect = {
      x: envelope?.center[0] ?? 0,
      y: envelope?.center[1] ?? 0,
      width: (envelope?.radius ?? 0) * 2,
      height: (envelope?.radius ?? 0) * 2,
      rotate: 0,
    };
  } else {
    rect = { rotate: 0, ...(computeScopeBoundingBox(scopeLayouts) ?? { x: 0, y: 0, width: 0, height: 0 }) };
  }
  return { rect };
};

/** 查询 Scope 连接几何时显式组合能力和最终包络 */
export const createScopeGeometryContext = (
  canon: CanonicalScope,
  geometry: CompiledScopeGeometry,
): BoundaryGeometryContext => {
  const { shape } = canon.envelope;
  return {
    shape,
    boundary: { ...shape, isShape: true },
    geometry: { rect: geometry.rect, margin: { top: 0, right: 0, bottom: 0, left: 0 } },
  };
};

/** 按 Core 包络规则向父 Scope 贡献布局；匿名 Scope 透传子布局 */
export const projectScopeCompileLayouts = (
  input: Pick<IRScope, 'id'>,
  envelope: BoundaryGeometryContext,
  children: ReadonlyArray<ReferenceGeometryContext>,
  transforms: ReadonlyArray<Transform>,
): Array<ReferenceGeometryContext> => {
  const transform = composeScopeTransform(transforms);
  return (input.id === undefined ? children : [envelope]).map(layout => projectReferenceGeometry(layout, transform));
};
