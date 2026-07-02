/** demo 自造数据集：按季度的访问量，date 用 ISO 字符串，喂给 time-axis.demo.tsx 的 <Plot data>（不进 IR） */
export const visits: Array<Record<string, string | number>> = [
  { date: '2024-01-01', value: 120 },
  { date: '2024-04-01', value: 180 },
  { date: '2024-07-01', value: 150 },
  { date: '2024-10-01', value: 220 },
];
