import type { BoundsInsets } from '@retikz/math';

/** 构造四边同值的盒模型边距 */
export const boxInsets = (value: number): BoundsInsets => ({
  top: value,
  right: value,
  bottom: value,
  left: value,
});
