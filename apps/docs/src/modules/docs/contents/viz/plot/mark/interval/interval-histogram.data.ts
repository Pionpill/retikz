/** 区间直方图使用 bin operation 处理的连续值 */
export const measurements: Array<Record<string, number>> = [
  { measurement: 2 },
  { measurement: 3 },
  { measurement: 3 },
  { measurement: 4 },
  { measurement: 5 },
  { measurement: 5 },
  { measurement: 5 },
  { measurement: 6 },
  { measurement: 6 },
  { measurement: 7 },
  { measurement: 8 },
  { measurement: 9 },
  { measurement: 11 },
  { measurement: 12 },
  { measurement: 14 },
  { measurement: 18 },
];

/** 根据分箱数量创建直方图变换 */
export const intervalHistogramOperationOf = (count: number) => ({
  kind: 'bin' as const,
  params: { field: 'measurement', count },
});
