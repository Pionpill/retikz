/** demo 自造数据集：每行一条阈值线（threshold 字段驱动 y、tier 字段驱动颜色）；喂 rule-per-datum.demo.tsx 的 <Plot data>（不进 IR） */
export const thresholds: Array<Record<string, string | number>> = [
  { tier: 'low', threshold: 30 },
  { tier: 'mid', threshold: 60 },
  { tier: 'high', threshold: 90 },
];
