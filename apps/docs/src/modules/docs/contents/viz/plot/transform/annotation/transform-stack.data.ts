/** demo 自造数据集：各季度各产品收入，用 stack 派生 y0/y1 累积界。 */
export const productRevenue: Array<Record<string, string | number>> = [
  { quarter: 'Q1', product: 'A', revenue: 30 },
  { quarter: 'Q1', product: 'B', revenue: 45 },
  { quarter: 'Q1', product: 'C', revenue: 25 },
  { quarter: 'Q2', product: 'A', revenue: 42 },
  { quarter: 'Q2', product: 'B', revenue: 28 },
  { quarter: 'Q2', product: 'C', revenue: 35 },
  { quarter: 'Q3', product: 'A', revenue: 24 },
  { quarter: 'Q3', product: 'B', revenue: 54 },
  { quarter: 'Q3', product: 'C', revenue: 32 },
];
