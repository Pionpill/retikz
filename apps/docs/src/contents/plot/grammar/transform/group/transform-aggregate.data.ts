/** demo 自造数据集：订单明细（每笔一行：region 地区 + revenue 金额），喂 aggregate 按地区求和（不进 IR） */
export const orders: Array<Record<string, string | number>> = [
  { region: 'North', revenue: 12 },
  { region: 'North', revenue: 8 },
  { region: 'North', revenue: 15 },
  { region: 'South', revenue: 9 },
  { region: 'South', revenue: 6 },
  { region: 'East', revenue: 20 },
  { region: 'East', revenue: 11 },
  { region: 'West', revenue: 7 },
];
