/** demo 自造数据集：两城指标；quarter 给极坐标角向，score 保持正值。 */
export const climate: Array<Record<string, string | number>> = [
  { city: 'North', month: 0, quarter: 'Q1', score: 42 },
  { city: 'North', month: 1, quarter: 'Q2', score: 58 },
  { city: 'North', month: 2, quarter: 'Q3', score: 72 },
  { city: 'North', month: 3, quarter: 'Q4', score: 64 },
  { city: 'South', month: 0, quarter: 'Q1', score: 65 },
  { city: 'South', month: 1, quarter: 'Q2', score: 54 },
  { city: 'South', month: 2, quarter: 'Q3', score: 78 },
  { city: 'South', month: 3, quarter: 'Q4', score: 86 },
];

/** demo 自造数据集：只通过 color 字段隐式拆分系列，避免和显式 series 示例长得一样。 */
export const channelTrend: Array<Record<string, string | number>> = [
  { channel: 'Web', month: 0, quarter: 'Q1', score: 36 },
  { channel: 'Web', month: 1, quarter: 'Q2', score: 62 },
  { channel: 'Web', month: 2, quarter: 'Q3', score: 55 },
  { channel: 'Web', month: 3, quarter: 'Q4', score: 82 },
  { channel: 'App', month: 0, quarter: 'Q1', score: 52 },
  { channel: 'App', month: 1, quarter: 'Q2', score: 48 },
  { channel: 'App', month: 2, quarter: 'Q3', score: 88 },
  { channel: 'App', month: 3, quarter: 'Q4', score: 70 },
];
