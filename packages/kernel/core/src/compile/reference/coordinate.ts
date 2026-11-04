import { createLayoutProbeRecoverableError } from '../../resolve';
import type { IRCoordinate, IRPosition } from '../../schemas';
import { resolvePosition } from './position';
import type { PositionTargetResolveContext } from './types';

/** 解析坐标声明的局部位置，不登记名称或创建输出 */
export const resolveCoordinatePosition = (input: IRCoordinate, context: PositionTargetResolveContext): IRPosition => {
  const position = resolvePosition(input.position, context)?.localPoint;
  if (position === undefined) {
    throw createLayoutProbeRecoverableError(
      `Cannot resolve position for coordinate ${input.id}; polar.origin or at.of may reference an undefined node`,
    );
  }

  return position;
};
