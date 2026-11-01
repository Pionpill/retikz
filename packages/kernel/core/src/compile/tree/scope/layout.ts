import type { CenteredBox } from '@retikz/math';
import { boundsOf, centerOfBounds } from '@retikz/math';

import type { IRPosition } from '../../../schemas';
import { ScopeBoundingShape } from '../../../schemas';
import { Anchor } from '../../../shared';
import { rect as rectOps } from '../../../shared/geometry';
import type { SharedCompileContext } from '../../context';
import type { CompiledNodeLayout } from '../node';
import { outerRectOf, createScopeCircleLayout, createScopeRectangleLayout } from '../node';
import type { InputScopeCompile } from './types';

/** 收集一组 CompiledNodeLayout 的全局 4 角点，供 AABB / MEC 等包络复用 */
export const collectScopeCornerPoints = (layouts: ReadonlyArray<CompiledNodeLayout>): Array<IRPosition> => {
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

/** 计算一组 layout 的全局 AABB；空数组返回 null */
export const computeScopeBoundingBox = (layouts: ReadonlyArray<CompiledNodeLayout>): CenteredBox | null => {
  const bounds = boundsOf(collectScopeCornerPoints(layouts));
  if (bounds === undefined) return null;

  const center = centerOfBounds(bounds);

  return { x: center[0], y: center[1], width: bounds.maxX - bounds.minX, height: bounds.maxY - bounds.minY };
};

/** 从当前 Scope 的固有 child layouts 创建 rectangle / circle synthetic envelope */
export const createIntrinsicScopeLayout = (
  child: InputScopeCompile,
  scopeLayouts: ReadonlyArray<CompiledNodeLayout>,
  shared: Pick<SharedCompileContext, 'registries'>,
): CompiledNodeLayout => {
  const id = child.id ?? '__anonymous_scope__';
  return child.boundingShape === ScopeBoundingShape.Circle
    ? createScopeCircleLayout(
        { id, cornerPoints: collectScopeCornerPoints(scopeLayouts), fallbackOrigin: [0, 0] },
        { shapes: shared.registries.shapeRegistry, boundaries: shared.registries.boundaryRegistry },
      )
    : createScopeRectangleLayout(
        { id, bbox: computeScopeBoundingBox(scopeLayouts), fallbackOrigin: [0, 0] },
        { shapes: shared.registries.shapeRegistry, boundaries: shared.registries.boundaryRegistry },
      );
};
