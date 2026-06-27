/** demo 自造数据集：逐月净现金流，跨零又跨数量级（适合对比 linear / symlog），不进 IR */
export const netFlow: Array<Record<string, number>> = [
  { month: 1, net: -9000 },
  { month: 2, net: -300 },
  { month: 3, net: 40 },
  { month: 4, net: 1200 },
  { month: 5, net: 15000 },
];
