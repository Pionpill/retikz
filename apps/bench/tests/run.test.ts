import { describe, expect, it } from 'vitest';

import { runCoreDeterministicBenchmarks } from '../src/shared';

describe('Core deterministic benchmark scenarios', () => {
  it('冻结 5000 单 entity update 的增量 work 与 full oracle', () => {
    const results = runCoreDeterministicBenchmarks();

    expect(results.find(result => result.id === 'core-single-entity-update-5000')).toEqual({
      id: 'core-single-entity-update-5000',
      oracle: 'acc755b3',
      visited: 5_000,
      reused: 4_999,
      changed: 1,
    });
  });
});
