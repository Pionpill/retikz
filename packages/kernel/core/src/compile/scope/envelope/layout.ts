import type { CenteredBox } from '@retikz/math';
import { boundsOf, centerOfBounds, circle } from '@retikz/math';

import type { CanonicalScope } from '../../../resolve';
import type { IRPosition } from '../../../schemas';
import { ScopeBoundingShape } from '../../../schemas';
import { Anchor } from '../../../shared';
import { rect as rectOps } from '../../../shared/geometry';
import { calculateOuterBoundaryRect } from '../../boundary';
import type { CompiledReferenceGeometry } from '../../reference';
import type { CompiledScopeGeometry } from '../types';

/** 收集子元素编译产物的全局边界点，供 AABB / MEC 等包络复用 */
const collectScopeCornerPoints = (layouts: ReadonlyArray<CompiledReferenceGeometry>): Array<IRPosition> => {
  const points: Array<IRPosition> = [];

  for (const layout of layouts) {
    if ('position' in layout) {
      points.push(layout.position);
      continue;
    }
    const outerRect = calculateOuterBoundaryRect(layout);
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
const calculateScopeBoundingBox = (layouts: ReadonlyArray<CompiledReferenceGeometry>): CenteredBox | null => {
  const bounds = boundsOf(collectScopeCornerPoints(layouts));
  if (bounds === undefined) return null;

  const center = centerOfBounds(bounds);

  return { x: center[0], y: center[1], width: bounds.maxX - bounds.minX, height: bounds.maxY - bounds.minY };
};

/** 从真实子布局聚合 rectangle / circle 包络，不经过节点解析或文字测量 */
export const layoutScopeEnvelope = (
  canon: CanonicalScope,
  scopeLayouts: ReadonlyArray<CompiledReferenceGeometry>,
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
    rect = { rotate: 0, ...(calculateScopeBoundingBox(scopeLayouts) ?? { x: 0, y: 0, width: 0, height: 0 }) };
  }
  return { rect, margin: { top: 0, right: 0, bottom: 0, left: 0 } };
};
