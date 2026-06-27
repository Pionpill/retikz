/** demo 自造数据集：月度营收，作为裸数据行喂给 line-scatter.demo.tsx 的 <Plot data>（不进 IR） */
export const sales: Array<Record<string, number>> = [
  { month: 0, revenue: 10 },
  { month: 1, revenue: 14 },
  { month: 2, revenue: 9 },
  { month: 3, revenue: 18 },
  { month: 4, revenue: 15 },
];
