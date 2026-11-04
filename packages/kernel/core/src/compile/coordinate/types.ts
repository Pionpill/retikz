import type { Position } from '@retikz/math';

/** 所属坐标系中的最终坐标，不承载节点形状或绘制属性 */
export type CompiledCoordinate = {
  position: Position;
};
