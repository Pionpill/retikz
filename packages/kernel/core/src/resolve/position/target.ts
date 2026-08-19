import type { IRAbsoluteTarget, IRNodeTarget, IRPosition } from '../../schemas';
import type { PositionTargetResolution, PositionTargetResolveContext, PositionTargetWorldResolution } from './types';

import { isBetweenPositionLike, isNodeTargetLike } from '../../shared';
import { lerpPoint } from '../../shared/geometry';
import { resolvePosition } from './resolve';

/** 在世界坐标叠加 NodeTarget offset */
const addNodeTargetOffset = (point: IRPosition, target: IRNodeTarget): IRPosition =>
  target.offset === undefined ? point : [point[0] + target.offset[0], point[1] + target.offset[1]];

/** 判断一个点是否可以进入后续 Scene 编译 */
const isFinitePoint = (point: IRPosition): boolean => Number.isFinite(point[0]) && Number.isFinite(point[1]);

/** 把 absolute target 绑定为世界参考点与可选 Node binding，不提前执行局部投影 */
export const resolvePositionTargetWorld = (
  target: IRAbsoluteTarget,
  context: PositionTargetResolveContext,
): PositionTargetWorldResolution => {
  if (isNodeTargetLike(target)) {
    const reference = context.lookupReference(target.id);
    if (reference === undefined) return { target, referencePoint: null };
    const boundaryResolution = context.boundaryResolutionOf?.(target, reference);
    const referencePoint = addNodeTargetOffset(
      context.pointOfNodeTarget(target, reference, boundaryResolution),
      target,
    );
    return {
      target,
      referencePoint,
      reference,
      ...(boundaryResolution === undefined ? {} : { boundaryResolution }),
    };
  }

  if (isBetweenPositionLike(target)) {
    const start = resolvePositionTargetWorld(target.between[0], context).referencePoint;
    const end = resolvePositionTargetWorld(target.between[1], context).referencePoint;
    if (start === null || end === null) return { target, referencePoint: null };
    const referencePoint = lerpPoint(start, end, target.fraction);
    if (!isFinitePoint(referencePoint)) return { target, referencePoint: null };
    return { target, referencePoint };
  }

  const position = resolvePosition(target, {
    ...context,
    resolveBetweenWorld: between => resolvePositionTargetWorld(between, context).referencePoint,
  });
  return {
    target,
    referencePoint: position?.worldPoint ?? null,
  };
};

/** 把 absolute target 确定为局部点、世界参考点与可选 Node binding */
export const resolvePositionTarget = (
  target: IRAbsoluteTarget,
  context: PositionTargetResolveContext,
): PositionTargetResolution => {
  const world = resolvePositionTargetWorld(target, context);
  return {
    ...world,
    point: world.referencePoint === null ? null : context.toLocal(world.referencePoint),
  };
};
