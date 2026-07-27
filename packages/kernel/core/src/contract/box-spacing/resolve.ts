import type { BoundsInsets } from '@retikz/math';

import type { IRBoxSpacing } from '../../schemas';

/** 构造四边同值的 spacing 结果 */
const boxInsets = (value: number): BoundsInsets => ({
  top: value,
  right: value,
  bottom: value,
  left: value,
});

/**
 * 把统一值或 CSS-like spacing 对象解析为完整四边值
 * @description 每一边依次采用 side、axis、default、fallback 中首个已提供的值；fallback 必须是有限非负数
 */
export const resolveBoxSpacing = (value: number | IRBoxSpacing | undefined, fallback: number): BoundsInsets => {
  if (!Number.isFinite(fallback) || fallback < 0) {
    throw new Error('resolveBoxSpacing: fallback must be a finite non-negative number');
  }
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
