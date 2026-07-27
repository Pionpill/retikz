/** 连续位置 scale playground 数据：同一 period 下同时提供正值序列与跨零序列，不进 IR */
export const continuousValues: Array<Record<string, number>> = [
  { period: 1, positive: 1, signed: -100_000 },
  { period: 2, positive: 10, signed: -1_000 },
  { period: 3, positive: 100, signed: -10 },
  { period: 4, positive: 1_000, signed: 0 },
  { period: 5, positive: 10_000, signed: 10 },
  { period: 6, positive: 100_000, signed: 1_000 },
  { period: 7, positive: 1_000_000, signed: 100_000 },
];
