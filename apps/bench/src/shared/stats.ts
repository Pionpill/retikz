/** wall-clock 样本摘要 */
export type SampleSummary = Readonly<{
  median: number;
  p95: number;
  max: number;
}>;

/** 计算固定样本的 median、nearest-rank p95 与 max */
export const summarizeSamples = (samples: ReadonlyArray<number>): SampleSummary => {
  if (samples.length === 0) throw new Error('summarizeSamples: samples must not be empty');
  if (samples.some(sample => !Number.isFinite(sample) || sample < 0)) {
    throw new Error('summarizeSamples: samples must be finite nonnegative numbers');
  }
  const sorted = [...samples].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  const median =
    sorted.length % 2 === 0 ? ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2 : (sorted[middle] ?? 0);
  const p95Index = Math.max(0, Math.ceil(sorted.length * 0.95) - 1);
  return Object.freeze({ median, p95: sorted[p95Index] ?? 0, max: sorted.at(-1) ?? 0 });
};
