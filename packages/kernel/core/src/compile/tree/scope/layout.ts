import type { CenteredBox } from '@retikz/math';
import { boundsOf, centerOfBounds } from '@retikz/math';

import type { Transform } from '../../../contract';
import type { IRPosition, IRScope } from '../../../schemas';
import { ScopeBoundingShape } from '../../../schemas';
import { Anchor } from '../../../shared';
import { rect as rectOps } from '../../../shared/geometry';
import type { CompiledNodeLayout } from '../../layout';
import type { SharedCompileContext } from '../../runtime';
import { composeScopeTransform } from '../../shared';
import { createScopeCircleLayout, createScopeRectangleLayout, outerRectOf, projectLayoutWithTransform } from '../node';
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
  registries: SharedCompileContext['registries'],
): CompiledNodeLayout => {
  const id = child.id ?? '__anonymous_scope__';
  return child.boundingShape === ScopeBoundingShape.Circle
    ? createScopeCircleLayout(
        { id, cornerPoints: collectScopeCornerPoints(scopeLayouts), fallbackOrigin: [0, 0] },
        { shapes: registries.shapeRegistry, boundaries: registries.boundaryRegistry },
      )
    : createScopeRectangleLayout(
        { id, bbox: computeScopeBoundingBox(scopeLayouts), fallbackOrigin: [0, 0] },
        { shapes: registries.shapeRegistry, boundaries: registries.boundaryRegistry },
      );
};

/** 按 Core 包络规则向父 Scope 贡献布局；匿名 Scope 透传子布局 */
export const projectScopeCompileLayouts = (
  input: Pick<IRScope, 'id'>,
  envelope: CompiledNodeLayout,
  children: ReadonlyArray<CompiledNodeLayout>,
  transforms: ReadonlyArray<Transform>,
): Array<CompiledNodeLayout> => {
  const transform = composeScopeTransform(transforms);
  return (input.id === undefined ? children : [envelope]).map(layout => projectLayoutWithTransform(layout, transform));
};
