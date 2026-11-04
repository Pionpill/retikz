import { pointAtArcAngle } from '@retikz/math';

import type { IRPosition } from '../../schemas';
import {
  anchorUnitVectorByAnchor,
  isAtPositionLike,
  isBetweenPositionLike,
  isOffsetPositionLike,
  isPositionTuple,
} from '../../shared';
import type { PositionResolution, PositionResolveContext, ResolvablePosition } from './types';

/** 为局部坐标点补上对应的世界坐标 */
const resolutionOfLocal = (localPoint: IRPosition, context: PositionResolveContext): PositionResolution => ({
  localPoint,
  worldPoint: context.toWorld(localPoint),
});

/** 为世界坐标点补上对应的局部坐标 */
const resolutionOfWorld = (worldPoint: IRPosition, context: PositionResolveContext): PositionResolution => ({
  localPoint: context.toLocal(worldPoint),
  worldPoint,
});

/**
 * 将位置配置解析为当前作用域的局部坐标与世界坐标
 * @description 坐标对、极坐标及偏移量按局部坐标计算；命名引用读取节点中心，between 由上下文回调解析
 * @returns 引用未找到或 between 无法解析时返回 null
 */
export const resolvePosition = (
  position: ResolvablePosition,
  context: PositionResolveContext,
): PositionResolution | null => {
  if (typeof position === 'string') {
    const reference = context.lookupReference(position);
    if (reference === undefined) return null;
    return resolutionOfWorld([reference.layout.geometry.rect.x, reference.layout.geometry.rect.y], context);
  }

  if (isPositionTuple(position)) return resolutionOfLocal([position[0], position[1]], context);
  if (isAtPositionLike(position)) {
    const reference = context.lookupReference(position.of);
    if (reference === undefined) return null;

    const referenceLocal = context.toLocal([reference.layout.geometry.rect.x, reference.layout.geometry.rect.y]);
    const distance = position.distance ?? context.nodeDistance;
    const [dx, dy] = anchorUnitVectorByAnchor[position.direction];

    return resolutionOfLocal([referenceLocal[0] + dx * distance, referenceLocal[1] + dy * distance], context);
  }

  if (isOffsetPositionLike(position)) {
    const base = resolvePosition(position.of, context);
    if (base === null) return null;

    return resolutionOfLocal(
      [base.localPoint[0] + position.offset[0], base.localPoint[1] + position.offset[1]],
      context,
    );
  }

  if (isBetweenPositionLike(position)) {
    const worldPoint = context.resolveBetweenWorld?.(position);
    return worldPoint === null || worldPoint === undefined ? null : resolutionOfWorld(worldPoint, context);
  }

  const origin =
    position.origin === undefined ? resolutionOfLocal([0, 0], context) : resolvePosition(position.origin, context);
  if (origin === null) return null;

  return resolutionOfLocal(pointAtArcAngle(origin.localPoint, position.radius, position.angle), context);
};
