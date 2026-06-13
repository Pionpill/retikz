import { describe, expect, it } from 'vitest';
import { formatViewBox } from '../../src/render/view-box';

describe('formatViewBox', () => {
  it('4 个字段按 `x y width height` 顺序拼接，空格分隔', () => {
    expect(formatViewBox({ x: 0, y: 0, width: 100, height: 50 })).toBe('0 0 100 50');
  });

  it('负数 / 小数原样输出（不做精度处理——precision 在 compile 阶段完成）', () => {
    expect(formatViewBox({ x: -5.5, y: -2.25, width: 10, height: 4 })).toBe('-5.5 -2.25 10 4');
  });

  it('0×0 viewBox 也合法', () => {
    expect(formatViewBox({ x: 0, y: 0, width: 0, height: 0 })).toBe('0 0 0 0');
  });
});
