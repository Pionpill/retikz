import { RetikzCoreError, RetikzCoreErrorCode } from '../../error';
import type { CssColorValue } from './types';

/**
 * 从非空 categorical palette 按稳定的非负整数索引循环取色
 * @template TColor 分类调色板的颜色成员类型，返回值保持该类型
 */
export const categoricalColorAt = <TColor extends CssColorValue>(
  palette: ReadonlyArray<TColor>,
  index: number,
): TColor => {
  if (palette.length === 0)
    throw new RetikzCoreError(RetikzCoreErrorCode.Color, 'categoricalColorAt: palette must not be empty.');
  if (!Number.isSafeInteger(index) || index < 0) {
    throw new RetikzCoreError(
      RetikzCoreErrorCode.Color,
      'categoricalColorAt: index must be a non-negative safe integer.',
    );
  }

  return palette[index % palette.length];
};
