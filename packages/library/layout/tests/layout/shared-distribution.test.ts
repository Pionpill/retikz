import { describe, expect, it } from 'vitest';

import { compensatedLayoutSum, distributeWeightedLayoutSizes, layoutEpsilon } from '../../src/composites/internal';

describe('共享加权布局分布', () => {
  it('条目达到最大值时冻结尺寸并按稳定源码顺序重新分配剩余增长量', () => {
    const inputs = [
      { base: 20, min: 0, max: 30, weight: 1 },
      { base: 20, min: 0, weight: 3 },
    ] as const;

    expect(distributeWeightedLayoutSizes(inputs, 100)).toEqual({ values: [30, 70], remaining: 0 });
    expect(inputs).toEqual([
      { base: 20, min: 0, max: 30, weight: 1 },
      { base: 20, min: 0, weight: 3 },
    ]);
  });

  it('在最小值处冻结一个项目并重新分配剩余的赤字', () => {
    expect(
      distributeWeightedLayoutSizes(
        [
          { base: 40, min: 30, weight: 1 },
          { base: 40, min: 0, weight: 1 },
        ],
        40,
      ),
    ).toEqual({ values: [30, 10], remaining: 0 });
  });

  it('在分配之前通过最小值和最大值夹紧每个初始碱基', () => {
    expect(distributeWeightedLayoutSizes([{ base: 5, min: 10, weight: 0 }], 10)).toEqual({
      values: [10],
      remaining: 0,
    });
    expect(
      distributeWeightedLayoutSizes(
        [
          { base: 5, min: 10, weight: 1 },
          { base: 30, min: 0, max: 20, weight: 1 },
          { base: 12, min: 12, max: 12, weight: 1 },
        ],
        42,
      ),
    ).toEqual({ values: [10, 20, 12], remaining: 0 });
  });

  it('当每个权重为零或每个边界都被冻结时，显式地留下不可用的自由空间', () => {
    expect(
      distributeWeightedLayoutSizes(
        [
          { base: 10, min: 0, weight: 0 },
          { base: 10, min: 0, weight: 0 },
        ],
        30,
      ),
    ).toEqual({ values: [10, 10], remaining: 10 });
    expect(distributeWeightedLayoutSizes([{ base: 10, min: 10, max: 10, weight: 1 }], 12)).toEqual({
      values: [10],
      remaining: 2,
    });
  });

  it('对长十进制和混合大小输入使用补偿的编写顺序和', () => {
    const decimals = Array.from({ length: 10_000 }, () => 0.1);

    expect(compensatedLayoutSum(decimals)).toBe(1000);
    expect(compensatedLayoutSum([1e16, 1, -1e16])).toBe(1);
  });

  it('当有限输入溢出有限算术时，会明确报错', () => {
    expect(() => compensatedLayoutSum([Number.MAX_VALUE, Number.MAX_VALUE])).toThrow(/finite/i);
    expect(() =>
      distributeWeightedLayoutSizes(
        [
          { base: Number.MAX_VALUE, min: 0, weight: 1 },
          { base: Number.MAX_VALUE, min: 0, weight: 1 },
        ],
        Number.MAX_VALUE,
      ),
    ).toThrow(/finite/i);
  });

  it('使用有限尺度感知 epsilon，而不将无界值视为数字', () => {
    expect(layoutEpsilon(1, 1)).toBe(Number.EPSILON * 64);
    expect(layoutEpsilon(1e9, 1e9 + 1)).toBeGreaterThan(Number.EPSILON * 64);
    expect(() => layoutEpsilon(Number.POSITIVE_INFINITY, 1)).toThrow(/finite/i);
  });
});
