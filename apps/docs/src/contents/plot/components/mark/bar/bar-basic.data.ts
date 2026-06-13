/** demo 自造数据集：季度营收（分类 x = 季度），喂给 bar-basic.demo.tsx 的 <Plot data>（不进 IR） */
export const revenue: Array<Record<string, string | number>> = [
  { quarter: 'Q1', value: 18 },
  { quarter: 'Q2', value: 24 },
  { quarter: 'Q3', value: 15 },
  { quarter: 'Q4', value: 30 },
];
