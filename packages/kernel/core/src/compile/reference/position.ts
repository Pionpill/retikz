import { pointAtArcAngle } from '@retikz/math';

import type { IRPosition } from '../../schemas';
import { anchorUnitVectorByAnchor } from '../../shared';
import { referencePositionOf } from './geometry';
import type { PositionEvaluation, PositionEvaluateContext, EvaluablePosition } from './types';

/** ⚡递归只求消费者需要的局部点，避免为中间原点生成世界点与结果对象 */
const evaluateLocalPosition = (position: EvaluablePosition, context: PositionEvaluateContext): IRPosition | null => {
  if (typeof position === 'string') {
    const reference = context.lookupReference(position, 'position');
    return reference === undefined ? null : context.toLocal(referencePositionOf(reference.geometry));
  }

  // ⚡消费已类型化的位置union，只按结构分支，不在每层重复校验字段值
  if (Array.isArray(position)) return [position[0], position[1]];
  if ('direction' in position) {
    const reference = context.lookupReference(position.of, 'position');
    if (reference === undefined) return null;

    const referenceLocal = context.toLocal(referencePositionOf(reference.geometry));
    const distance = position.distance ?? context.nodeDistance;
    const [dx, dy] = anchorUnitVectorByAnchor[position.direction];
    return [referenceLocal[0] + dx * distance, referenceLocal[1] + dy * distance];
  }

  if ('of' in position) {
    const base = evaluateLocalPosition(position.of, context);
    return base === null ? null : [base[0] + position.offset[0], base[1] + position.offset[1]];
  }

  if ('between' in position) {
    const worldPoint = context.evaluateBetweenWorld?.(position);
    return worldPoint === null || worldPoint === undefined ? null : context.toLocal(worldPoint);
  }

  const origin =
    position.origin === undefined ? ([0, 0] satisfies IRPosition) : evaluateLocalPosition(position.origin, context);
  return origin === null ? null : pointAtArcAngle(origin, position.radius, position.angle);
};

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
    const worldPoint = referencePositionOf(reference.geometry);
    return { localPoint: context.toLocal(worldPoint), worldPoint };
  }

  // 根级世界点直接保留，避免局部往返改变原引用或插值结果
  if ('between' in position) {
    const worldPoint = context.evaluateBetweenWorld?.(position);
    return worldPoint === null || worldPoint === undefined
      ? null
      : { localPoint: context.toLocal(worldPoint), worldPoint };
  }

  const localPoint = evaluateLocalPosition(position, context);
  return localPoint === null ? null : { localPoint, worldPoint: context.toWorld(localPoint) };
};
