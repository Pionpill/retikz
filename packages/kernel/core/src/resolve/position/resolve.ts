import type { IRCoordinate, PolarPosition, IRAbsoluteTarget } from '../../schemas';
import { isPositionTuple } from '../../shared';
import type {
  CanonicalAbsoluteTarget,
  CanonicalPosition,
  CanonicalPolarPosition,
  PositionResolveContext,
} from './types';

/** 补齐嵌套极坐标原点，不执行引用查询 */
export const resolvePolarPosition = (position: PolarPosition): CanonicalPolarPosition => {
  const { origin = [0, 0], angle, radius } = position;
  return {
    origin: typeof origin === 'string' ? origin : isPositionTuple(origin) ? [...origin] : resolvePolarPosition(origin),
    angle,
    radius,
  };
};

/** 补齐绝对目标中的嵌套位置表达式 */
export const resolveAbsoluteTarget = (target: IRAbsoluteTarget): CanonicalAbsoluteTarget => {
  if (isPositionTuple(target)) return [...target];
  if ('id' in target) return { ...target };
  if ('between' in target)
    return {
      between: [resolveAbsoluteTarget(target.between[0]), resolveAbsoluteTarget(target.between[1])],
      fraction: target.fraction,
    };
  if ('offset' in target)
    return {
      of:
        typeof target.of === 'string'
          ? target.of
          : isPositionTuple(target.of)
            ? [...target.of]
            : resolvePolarPosition(target.of),
      offset: [...target.offset],
    };
  return resolvePolarPosition(target);
};

/** 将稀疏坐标声明确定为完整位置表达式，几何引用留给编译阶段 */
export const resolvePosition = (
  position: IRCoordinate['position'],
  context: PositionResolveContext,
): CanonicalPosition => {
  if (!isPositionTuple(position) && 'direction' in position)
    return { ...position, distance: position.distance ?? context.nodeDistance };
  if (isPositionTuple(position)) return [...position];
  if ('between' in position)
    return {
      between: [resolveAbsoluteTarget(position.between[0]), resolveAbsoluteTarget(position.between[1])],
      fraction: position.fraction,
    };
  if ('offset' in position)
    return {
      of:
        typeof position.of === 'string'
          ? position.of
          : isPositionTuple(position.of)
            ? [...position.of]
            : resolvePolarPosition(position.of),
      offset: [...position.offset],
    };
  return resolvePolarPosition(position);
};
