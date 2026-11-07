import type { Position } from '@retikz/math';

import type { CanonicalCoordinate } from '../../resolve';
import { createLayoutProbeRecoverableError } from '../../resolve';
import { evaluatePosition } from '../reference';
import type { PositionEvaluateContext } from '../reference';

/** 所属坐标系中的最终坐标，不承载节点形状或绘制属性 */
export type CompiledCoordinate = {
  /** 当前作用域中的局部坐标 */
  position: Position;
};

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
