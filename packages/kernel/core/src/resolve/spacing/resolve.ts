import type { BoundsInsets } from '@retikz/math';

import { RetikzCoreError, RetikzCoreErrorCode } from '../../error';
import type { IRBoxSpacing } from '../../schemas';

/** 构造上下左右间距相同的结果 */
const buildUniformBoxInsets = (value: number): BoundsInsets => ({
  top: value,
  right: value,
  bottom: value,
  left: value,
});

/**
 * 将数值或分方向的间距配置展开为上下左右四边值
 * @description 数值应用到四边；对象中每边依次取单边字段、轴向字段 x / y、default、fallback 中首个已提供的值
 * @param fallback 配置未提供相应值时使用的间距，必须是有限非负数
 * @throws fallback 不满足要求时抛出 RetikzCoreError
 */
export const resolveBoxSpacing = (value: number | IRBoxSpacing | undefined, fallback: number): BoundsInsets => {
  if (!Number.isFinite(fallback) || fallback < 0) {
    throw new RetikzCoreError(
      RetikzCoreErrorCode.Contract,
      'resolveBoxSpacing: fallback must be a finite non-negative number',
    );
  }

  if (typeof value === 'number') {
    return buildUniformBoxInsets(value);
  }

  const base = value?.default ?? fallback;

  return {
    top: value?.top ?? value?.y ?? base,
    right: value?.right ?? value?.x ?? base,
    bottom: value?.bottom ?? value?.y ?? base,
    left: value?.left ?? value?.x ?? base,
  };
};
