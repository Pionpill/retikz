/** demo 自造数据集：任务起止值，用 derive-interval 派生统一的 y0/y1 区间字段。 */
export const tasks: Array<Record<string, string | number>> = [
  { task: 'A', phase: 'design', start: 1, end: 4 },
  { task: 'B', phase: 'build', start: 2, end: 7 },
  { task: 'C', phase: 'test', start: 5, end: 9 },
  { task: 'D', phase: 'ship', start: 8, end: 11 },
];
