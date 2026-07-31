import { describe, expect, it } from 'vitest';

import { summarizeSamples } from '../src/shared';

describe('wall-clock statistics', () => {
  it('确定性计算 median、p95 与 max', () => {
    const samples = Array.from({ length: 20 }, (_, index) => index + 1);

    expect(summarizeSamples(samples)).toEqual({ median: 10.5, p95: 19, max: 20 });
  });

  it('拒绝空数组和非有限样本', () => {
    expect(() => summarizeSamples([])).toThrow(/samples/i);
    expect(() => summarizeSamples([1, Number.NaN])).toThrow(/finite/i);
  });
});
