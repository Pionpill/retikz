import { pointAtArcAngle } from '@retikz/math';

import type { IRPosition, IRResolvablePosition } from '../../schemas';
import type { PositionResolution, PositionResolveContext } from './types';

import {
  AnchorUnitVectorByAnchor,
  isAtPositionLike,
  isBetweenPositionLike,
  isNodeTargetLike,
  isOffsetPositionLike,
  isPolarPositionLike,
  isPositionTuple,
} from '../../shared';

/** 从 position referent 中提取诊断用节点 id；只读输入，不解析 namespace */
export const nodeIdFromPositionReferent = (reference: unknown): string | undefined =>
  typeof reference === 'string' ? reference : nodeIdFromResolvableTarget(reference);

/** 从可解析 target / position 形态中提取一个代表性节点 id，供 unresolved warning 使用 */
export const nodeIdFromResolvableTarget = (target: unknown): string | undefined => {
  if (isNodeTargetLike(target)) return target.id;
  if (isBetweenPositionLike(target)) {
    return nodeIdFromResolvableTarget(target.between[0]) ?? nodeIdFromResolvableTarget(target.between[1]);
  }
  if (isOffsetPositionLike(target) || isAtPositionLike(target)) return nodeIdFromPositionReferent(target.of);
  if (isPolarPositionLike(target)) return nodeIdFromPositionReferent(target.origin);
  return undefined;
};

/** 从局部点建立同时包含 local/world 的确定结果 */
const resolutionOfLocal = (localPoint: IRPosition, context: PositionResolveContext): PositionResolution => ({
  localPoint,
  worldPoint: context.toWorld(localPoint),
});

/** 从世界点建立同时包含 local/world 的确定结果 */
const resolutionOfWorld = (worldPoint: IRPosition, context: PositionResolveContext): PositionResolution => ({
  localPoint: context.toLocal(worldPoint),
  worldPoint,
});

/**
 * 把 Position Source IR 确定为当前 Scope 局部点和世界点
 * @description tuple、polar 与 offset 使用局部度量；命名引用从世界坐标反投影；解析失败返回 null
 */
export const resolvePosition = (
  position: IRResolvablePosition,
  context: PositionResolveContext,
): PositionResolution | null => {
  if (typeof position === 'string') {
    const reference = context.lookupReference(position);
    if (reference === undefined) return null;
    return resolutionOfWorld([reference.node.rect.x, reference.node.rect.y], context);
  }
  if (isPositionTuple(position)) return resolutionOfLocal([position[0], position[1]], context);
  if (isAtPositionLike(position)) {
    const reference = context.lookupReference(position.of);
    if (reference === undefined) return null;
    const referenceLocal = context.toLocal([reference.node.rect.x, reference.node.rect.y]);
    const distance = position.distance ?? context.nodeDistance;
    const [dx, dy] = AnchorUnitVectorByAnchor[position.direction];
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
