import { describe, expect, it } from 'vitest';

import { solveMarkPadding } from '../../../src/resolve/scale/mark-padding';

const samples = [
  { position: 0, lower: 0.02, upper: 0.02 },
  { position: 0.5, lower: 0.3, upper: 0.3 },
  { position: 1, lower: 0.02, upper: 0.02 },
];

describe('逐点留白约束', () => {
  it('中央大点不迫使两端采用最大半径', () => {
    const result = solveMarkPadding(samples, {}, 0.0001);

    expect(result.lower).toBeLessThan(0.021);
    expect(result.upper).toBeLessThan(0.021);

    for (const sample of samples) {
      const position = result.lower + sample.position * (1 - result.lower - result.upper);

      expect(position).toBeGreaterThanOrEqual(sample.lower);
      expect(position).toBeLessThanOrEqual(1 - sample.upper);
    }

    expect(solveMarkPadding([...samples].reverse(), {}, 0.0001)).toEqual(result);
  });

  it('靠内的大点也参与边缘约束', () => {
    const result = solveMarkPadding([...samples, { position: 0.05, lower: 0.2, upper: 0.2 }], {}, 0.0001);

    expect(result.lower + 0.05 * (1 - result.lower - result.upper)).toBeGreaterThanOrEqual(0.2);
  });

  it('显式零关闭该端保护，另一端仍求解', () => {
    const result = solveMarkPadding(samples, { lower: 0 }, 0.0001);

    expect(result.lower).toBe(0);
    expect(result.upper).toBeGreaterThanOrEqual(0.02);
  });

  it('空集不产生自动留白', () => {
    expect(solveMarkPadding([], {}, 0.0001)).toEqual({ lower: 0, upper: 0 });
  });

  it('恰好填满宽度的中央点保持可行', () => {
    expect(solveMarkPadding([{ position: 0.5, lower: 0.5, upper: 0.5 }], {}, 0.0001)).toEqual({ lower: 0, upper: 0 });
  });

  it('无法容纳的点明确失败', () => {
    expect(() => solveMarkPadding([{ position: 0.5, lower: 0.6, upper: 0.6 }], {}, 0.0001)).toThrow(/feasible/);
  });
});
