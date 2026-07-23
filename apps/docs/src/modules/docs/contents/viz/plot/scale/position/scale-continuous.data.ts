/** demo 自造数据集：用户量逐年增长，跨多个数量级（适合对比 linear / log / sqrt），不进 IR */
export const growth: Array<Record<string, number>> = [
  { year: 2018, users: 12 },
  { year: 2019, users: 90 },
  { year: 2020, users: 640 },
  { year: 2021, users: 4200 },
  { year: 2022, users: 28000 },
];
