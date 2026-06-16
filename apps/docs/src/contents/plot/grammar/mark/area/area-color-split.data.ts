/** demo 自造数据集：两个站点的日访问量（site 分类 + day + visits），喂多系列面积（不进 IR） */
export const traffic: Array<Record<string, string | number>> = [
  { site: 'A', day: 0, visits: 3 },
  { site: 'A', day: 1, visits: 6 },
  { site: 'A', day: 2, visits: 4 },
  { site: 'A', day: 3, visits: 8 },
  { site: 'B', day: 0, visits: 2 },
  { site: 'B', day: 1, visits: 3 },
  { site: 'B', day: 2, visits: 7 },
  { site: 'B', day: 3, visits: 5 },
];
