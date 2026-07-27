import type { BoundsInsets } from '@retikz/math';

import type { IRAxisScale, IRBoxSize } from '../../schemas';
import type { AxisScale, BoxSize } from './types';

type NodeAxisScaleValue = number | IRAxisScale | undefined;
type NodeBoxSizeValue = number | IRBoxSize | undefined;

/** 构造四边同值的盒模型边距 */
export const boxInsets = (value: number): BoundsInsets => ({
  top: value,
  right: value,
  bottom: value,
  left: value,
});

/** 解析节点轴向缩放 */
export const resolveAxisScale = (value: NodeAxisScaleValue, fallback: number): AxisScale => {
  if (typeof value === 'number') return { x: value, y: value };
  const base = value?.default ?? fallback;
  return {
    x: value?.x ?? base,
    y: value?.y ?? base,
  };
};

/** 解析节点盒尺寸 */
export const resolveBoxSize = (value: NodeBoxSizeValue, fallback: number): BoxSize => {
  if (typeof value === 'number') return { width: value, height: value };
  const base = value?.default ?? fallback;
  return {
    width: value?.width ?? base,
    height: value?.height ?? base,
  };
};
