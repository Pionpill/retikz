import type { BoundsInsets } from '@retikz/math';

import type { IRAxisScale, IRBoxSize, IRBoxSpacing } from '../../schemas';
import type { AxisScale, BoxSize } from './types';

type NodeSpacingValue = number | IRBoxSpacing | undefined;
type NodeAxisScaleValue = number | IRAxisScale | undefined;
type NodeBoxSizeValue = number | IRBoxSize | undefined;

/** 构造四边同值的盒模型边距 */
export const boxInsets = (value: number): BoundsInsets => ({
  top: value,
  right: value,
  bottom: value,
  left: value,
});

/** 解析节点盒间距，支持统一值、轴向值和边向值 */
export const resolveBoxSpacing = (value: NodeSpacingValue, fallback: number): BoundsInsets => {
  if (typeof value === 'number') {
    return boxInsets(value);
  }
  const base = value?.default ?? fallback;
  return {
    top: value?.top ?? value?.y ?? base,
    right: value?.right ?? value?.x ?? base,
    bottom: value?.bottom ?? value?.y ?? base,
    left: value?.left ?? value?.x ?? base,
  };
};

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
