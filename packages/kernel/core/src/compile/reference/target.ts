import { lerp } from '@retikz/math';

import type { IRAbsoluteTarget, IRNodeTarget, IRPosition } from '../../schemas';
import { isBetweenPositionLike, isNodeTargetLike } from '../../shared';
import { evaluatePosition } from './position';
import type { PositionTargetEvaluation, PositionTargetEvaluateContext, PositionTargetWorldEvaluation } from './types';

/** 解析目标的世界坐标，并保留直接节点引用与连接面；无法定位时 referencePoint 为 null */
export const evaluatePositionTargetWorld = (
  target: IRAbsoluteTarget,
  context: PositionTargetEvaluateContext,
): PositionTargetWorldEvaluation => {
  /** 在节点目标的世界坐标上叠加 offset */
  const addNodeTargetOffset = (point: IRPosition, nodeTarget: IRNodeTarget): IRPosition =>
    nodeTarget.offset === undefined ? point : [point[0] + nodeTarget.offset[0], point[1] + nodeTarget.offset[1]];

  /** 判断点的两个坐标是否均为有限数值 */
  const isFinitePoint = (point: IRPosition): boolean => Number.isFinite(point[0]) && Number.isFinite(point[1]);

  if (isNodeTargetLike(target)) {
    const reference = context.lookupReference(
      target.id,
      target.anchor !== undefined && (target.boundary === undefined || target.boundary === 'shape')
        ? { anchor: target.anchor, boundary: target.boundary === undefined ? undefined : 'shape' }
        : 'boundary',
    );
    if (reference === undefined) return { target, referencePoint: null };

    const canonicalBoundary = context.bindNodeTargetBoundary?.(target, reference);
    const referencePoint = addNodeTargetOffset(
      context.evaluateNodeTargetPoint(target, reference, canonicalBoundary),
      target,
    );

    return {
      target,
      referencePoint,
      reference,
      ...(canonicalBoundary === undefined ? {} : { canonicalBoundary }),
    };
  }

  if (isBetweenPositionLike(target)) {
    const start = evaluatePositionTargetWorld(target.between[0], context).referencePoint;
    const end = evaluatePositionTargetWorld(target.between[1], context).referencePoint;
    if (start === null || end === null) return { target, referencePoint: null };

    const referencePoint = lerp(start, end, target.fraction);
    if (!isFinitePoint(referencePoint)) return { target, referencePoint: null };

    return { target, referencePoint };
  }

  const position = evaluatePosition(target, {
    ...context,
    evaluateBetweenWorld: between => evaluatePositionTargetWorld(between, context).referencePoint,
  });

  return {
    target,
    referencePoint: position?.worldPoint ?? null,
  };
};

/** 解析目标的局部坐标、世界坐标和直接节点引用；无法定位时两个坐标均为 null */
export const evaluatePositionTarget = (
  target: IRAbsoluteTarget,
  context: PositionTargetEvaluateContext,
): PositionTargetEvaluation => {
  const world = evaluatePositionTargetWorld(target, context);
  return {
    ...world,
    point: world.referencePoint === null ? null : context.toLocal(world.referencePoint),
  };
};
