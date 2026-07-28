/** demo 自造数据集：订单明细（每笔一行：region 地区 + revenue 金额），喂 summarize 按地区求和（不进 IR） */
export const orders: Array<Record<string, string | number>> = [
  { region: 'A', revenue: 12 },
  { region: 'A', revenue: 8 },
  { region: 'A', revenue: 15 },
  { region: 'B', revenue: 9 },
  { region: 'B', revenue: 6 },
  { region: 'C', revenue: 20 },
  { region: 'C', revenue: 11 },
  { region: 'D', revenue: 7 },
];
