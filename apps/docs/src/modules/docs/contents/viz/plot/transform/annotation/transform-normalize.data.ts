/** demo 自造数据集：各季度各产品销量（quarter + product + amount），喂 [normalize, stack] 做百分比堆叠（不进 IR） */
export const revenue: Array<Record<string, string | number>> = [
  { quarter: 'Q1', product: 'A', amount: 30 },
  { quarter: 'Q1', product: 'B', amount: 50 },
  { quarter: 'Q1', product: 'C', amount: 20 },
  { quarter: 'Q2', product: 'A', amount: 45 },
  { quarter: 'Q2', product: 'B', amount: 30 },
  { quarter: 'Q2', product: 'C', amount: 25 },
  { quarter: 'Q3', product: 'A', amount: 20 },
  { quarter: 'Q3', product: 'B', amount: 40 },
  { quarter: 'Q3', product: 'C', amount: 40 },
];
