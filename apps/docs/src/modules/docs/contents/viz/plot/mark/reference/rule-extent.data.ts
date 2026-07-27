/** demo 自造数据集：每行用 spanStart / spanEnd 截出一段局部参考线 */
export const referenceSpans: Array<Record<string, string | number>> = [
  { tier: 'low', threshold: 25, spanStart: 10, spanEnd: 50 },
  { tier: 'low', threshold: 40, spanStart: 22, spanEnd: 75 },
  { tier: 'mid', threshold: 55, spanStart: 8, spanEnd: 92 },
  { tier: 'high', threshold: 70, spanStart: 35, spanEnd: 96 },
  { tier: 'high', threshold: 85, spanStart: 52, spanEnd: 110 },
];
