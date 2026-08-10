import { describe, expect, it } from 'vitest';

import { compensatedLayoutSum, distributeWeightedLayoutSizes, layoutEpsilon } from '../../src/composites/internal';

describe('shared weighted layout distribution', () => {
  it('freezes an item at max and redistributes remaining growth by stable source order', () => {
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

  it('freezes an item at min and redistributes the remaining deficit', () => {
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

  it('clamps every initial base through min and max before distributing', () => {
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

  it('leaves unavailable free space explicit when every weight is zero or every bound is frozen', () => {
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

  it('uses compensated authored-order sums for long decimal and mixed-magnitude inputs', () => {
    const decimals = Array.from({ length: 10_000 }, () => 0.1);

    expect(compensatedLayoutSum(decimals)).toBe(1000);
    expect(compensatedLayoutSum([1e16, 1, -1e16])).toBe(1);
  });

  it('fails loudly when otherwise finite inputs overflow finite arithmetic', () => {
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

  it('uses a finite scale-aware epsilon without treating unbounded values as numbers', () => {
    expect(layoutEpsilon(1, 1)).toBe(Number.EPSILON * 64);
    expect(layoutEpsilon(1e9, 1e9 + 1)).toBeGreaterThan(Number.EPSILON * 64);
    expect(() => layoutEpsilon(Number.POSITIVE_INFINITY, 1)).toThrow(/finite/i);
  });
});
