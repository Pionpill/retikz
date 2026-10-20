import assert from 'node:assert/strict';

import type { LatencySummary } from './types';

/** 从单次调用耗时计算中位数与 nearest-rank 尾部分位数 */
export const summarizeLatency = (samples: ReadonlyArray<number>): LatencySummary => {
  assert(
    samples.length > 0 && samples.every(sample => Number.isFinite(sample) && sample >= 0),
    'Invalid latency samples',
  );
  const sorted = [...samples].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return {
    samples: sorted.length,
    mean: sorted.reduce((sum, sample) => sum + sample, 0) / sorted.length,
    p50: sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle],
    p90: sorted[Math.ceil(sorted.length * 0.9) - 1],
    p99: sorted[Math.ceil(sorted.length * 0.99) - 1],
  };
};
