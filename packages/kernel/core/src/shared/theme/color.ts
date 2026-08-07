import type { CssColorValue } from './types';

/** 从非空 categorical palette 按稳定的非负整数索引循环取色 */
export const categoricalColorAt = <TColor extends CssColorValue>(
  palette: ReadonlyArray<TColor>,
  index: number,
): TColor => {
  if (palette.length === 0) throw new Error('categoricalColorAt: palette must not be empty.');
  if (!Number.isSafeInteger(index) || index < 0) {
    throw new Error('categoricalColorAt: index must be a non-negative safe integer.');
  }
  return palette[index % palette.length];
};
