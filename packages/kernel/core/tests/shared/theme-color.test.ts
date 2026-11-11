import { describe, expect, it } from 'vitest';

import { categoricalColorAt, RetikzCoreError, RetikzCoreErrorCode } from '../../src';

describe('分类调色板循环取色', () => {
  it('保持首尾颜色的索引，并在超出长度时从头循环', () => {
    const palette = ['red', 'blue'];

    expect(categoricalColorAt(palette, 0)).toBe('red');
    expect(categoricalColorAt(palette, 1)).toBe('blue');
    expect(categoricalColorAt(palette, 2)).toBe('red');
  });

  it.each([
    { name: '空调色板', palette: [], index: 0 },
    { name: '负索引', palette: ['red'], index: -1 },
    { name: '分数索引', palette: ['red'], index: 0.5 },
    { name: '非安全整数索引', palette: ['red'], index: Number.MAX_SAFE_INTEGER + 1 },
  ])('拒绝 $name 并归属 Core Color 错误', ({ palette, index }) => {
    expect(() => categoricalColorAt(palette, index)).toThrow(
      expect.objectContaining({
        constructor: RetikzCoreError,
        code: RetikzCoreErrorCode.Color,
      }),
    );
  });
});
