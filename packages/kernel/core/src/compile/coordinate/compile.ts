import type { CanonicalCoordinate } from '../../resolve';
import { createLayoutProbeRecoverableError } from '../../resolve';
import { evaluatePosition } from '../reference';
import type { PositionEvaluateContext } from '../reference';
import type { CompiledCoordinate } from './types';

/** 在引用就绪后计算坐标的局部位置 */
export const compileCoordinate = (canon: CanonicalCoordinate, context: PositionEvaluateContext): CompiledCoordinate => {
  const { id, position } = canon;
  const result = evaluatePosition(position, context);
  if (result === null)
    throw createLayoutProbeRecoverableError(
      `Cannot resolve position for coordinate ${id}; polar.origin or at.of may reference an undefined node`,
    );
  return { position: result.localPoint };
};
