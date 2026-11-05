import type { AxisAlignedBounds } from '@retikz/math';
import { describe, expect, it } from 'vitest';

import { calculateLayoutFromBounds, createRound } from '../../../../core/src/compile/scene';

const round2 = createRound(2);

const noRound = (n: number) => n;

describe('calculateLayoutFromBounds', () => {
  it('有限输入在边界相减、留白扩张或舍入中溢出时拒绝输出', () => {
    const wideBounds: AxisAlignedBounds = { minX: -1e308, maxX: 1e308, minY: 0, maxY: 1 };
    const smallBounds: AxisAlignedBounds = { minX: 0, maxX: 1, minY: 0, maxY: 1 };
    const largeBounds: AxisAlignedBounds = { minX: 0, maxX: 1e308, minY: 0, maxY: 1 };
    for (const calculate of [
      () => calculateLayoutFromBounds(wideBounds, 0, noRound),
      () => calculateLayoutFromBounds(smallBounds, 1e308, noRound),
      () => calculateLayoutFromBounds(largeBounds, 0, round2),
    ]) {
      expect(calculate).toThrow(/Scene layout produced non-finite bounds/);
    }
  });

  it('bounds 入口为空时返回自动 layout 兜底框', () => {
    expect(calculateLayoutFromBounds(undefined, 10, round2)).toEqual({ x: 0, y: 0, width: 100, height: 100 });
  });

  it('单个点：bbox 为 0×0 + 四周 padding', () => {
    expect(calculateLayoutFromBounds({ minX: 5, minY: 7, maxX: 5, maxY: 7 }, 4, noRound)).toEqual({
      x: 1, // 5 - 4
      y: 3, // 7 - 4
      width: 8, // 0 + 2×4
      height: 8,
    });
  });

  it('边界四周扩展 padding', () => {
    expect(calculateLayoutFromBounds({ minX: 0, minY: 0, maxX: 10, maxY: 20 }, 5, noRound)).toEqual({
      x: -5,
      y: -5,
      width: 20, // 10 + 2×5
      height: 30, // 20 + 2×5
    });
  });

  it('负坐标边界保持位置和尺寸', () => {
    expect(calculateLayoutFromBounds({ minX: -10, minY: -5, maxX: 10, maxY: 5 }, 0, noRound)).toEqual({
      x: -10,
      y: -5,
      width: 20,
      height: 10,
    });
  });

  it('round 回调被应用于全部 4 个字段', () => {
    expect(calculateLayoutFromBounds({ minX: 0.111, minY: 0.222, maxX: 10.337, maxY: 20.448 }, 1, round2)).toEqual({
      x: -0.89, // 0.111 - 1 = -0.889 → -0.89
      y: -0.78, // 0.222 - 1 = -0.778 → -0.78
      width: 12.23, // 10.337 - 0.111 + 2 = 12.226 → 12.23
      height: 22.23, // 20.448 - 0.222 + 2 = 22.226 → 22.23
    });
  });

  it('padding=0 时 bbox 紧贴极值点', () => {
    expect(calculateLayoutFromBounds({ minX: 1, minY: 2, maxX: 5, maxY: 6 }, 0, noRound)).toEqual({
      x: 1,
      y: 2,
      width: 4,
      height: 4,
    });
  });

  it('所有点重合：bbox 为 0×0 + padding（不退化为兜底框）', () => {
    expect(calculateLayoutFromBounds({ minX: 3, minY: 3, maxX: 3, maxY: 3 }, 2, noRound)).toEqual({
      x: 1,
      y: 1,
      width: 4,
      height: 4,
    });
  });
});
