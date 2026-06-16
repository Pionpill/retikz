/** demo 自造数据集：季度 × 产品营收（与分组柱同源），喂给 bar-stacked.demo.tsx 的 <Plot data>（不进 IR） */
export const sales: Array<Record<string, string | number>> = [
  { quarter: 'Q1', product: 'A', revenue: 12 },
  { quarter: 'Q1', product: 'B', revenue: 8 },
  { quarter: 'Q2', product: 'A', revenue: 18 },
  { quarter: 'Q2', product: 'B', revenue: 14 },
  { quarter: 'Q3', product: 'A', revenue: 9 },
  { quarter: 'Q3', product: 'B', revenue: 20 },
];
