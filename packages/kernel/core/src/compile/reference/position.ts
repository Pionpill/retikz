import { pointAtArcAngle } from '@retikz/math';

import type { IRPosition } from '../../schemas';
import {
  anchorUnitVectorByAnchor,
  isAtPositionLike,
  isBetweenPositionLike,
  isOffsetPositionLike,
  isPositionTuple,
} from '../../shared';
import { referencePositionOf } from './geometry';
import type { PositionEvaluation, PositionEvaluateContext, EvaluablePosition } from './types';

/** 为局部坐标点补上对应的世界坐标 */
const evaluationOfLocal = (localPoint: IRPosition, context: PositionEvaluateContext): PositionEvaluation => ({
  localPoint,
  worldPoint: context.toWorld(localPoint),
});

/** 为世界坐标点补上对应的局部坐标 */
const evaluationOfWorld = (worldPoint: IRPosition, context: PositionEvaluateContext): PositionEvaluation => ({
  localPoint: context.toLocal(worldPoint),
  worldPoint,
});

/**
 * 将位置配置解析为当前作用域的局部坐标与世界坐标
 * @description 坐标对、极坐标及偏移量按局部坐标计算；命名引用读取节点中心，between 由上下文回调解析
 * @returns 引用未找到或 between 无法解析时返回 null
 */
export const evaluatePosition = (
  position: EvaluablePosition,
  context: PositionEvaluateContext,
): PositionEvaluation | null => {
  if (typeof position === 'string') {
    const reference = context.lookupReference(position, 'position');
    if (reference === undefined) return null;
    return evaluationOfWorld(referencePositionOf(reference.context), context);
  }

  if (isPositionTuple(position)) return evaluationOfLocal([position[0], position[1]], context);
  if (isAtPositionLike(position)) {
    const reference = context.lookupReference(position.of, 'position');
    if (reference === undefined) return null;

    const referenceLocal = context.toLocal(referencePositionOf(reference.context));
    const distance = position.distance ?? context.nodeDistance;
    const [dx, dy] = anchorUnitVectorByAnchor[position.direction];

    return evaluationOfLocal([referenceLocal[0] + dx * distance, referenceLocal[1] + dy * distance], context);
  }

  if (isOffsetPositionLike(position)) {
    const base = evaluatePosition(position.of, context);
    if (base === null) return null;

    return evaluationOfLocal(
      [base.localPoint[0] + position.offset[0], base.localPoint[1] + position.offset[1]],
      context,
    );
  }

  if (isBetweenPositionLike(position)) {
    const worldPoint = context.evaluateBetweenWorld?.(position);
    return worldPoint === null || worldPoint === undefined ? null : evaluationOfWorld(worldPoint, context);
  }

  const origin =
    position.origin === undefined ? evaluationOfLocal([0, 0], context) : evaluatePosition(position.origin, context);
  if (origin === null) return null;

  return evaluationOfLocal(pointAtArcAngle(origin.localPoint, position.radius, position.angle), context);
};
