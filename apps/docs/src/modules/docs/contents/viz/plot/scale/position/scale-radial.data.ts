/** 平方级差：radial 映射后半径形成 1:2:3:4，便于直接观察面积线性 */
export const squareSteps: Array<Record<string, string | number>> = [
  { category: 'A', value: 1 },
  { category: 'B', value: 4 },
  { category: 'C', value: 9 },
  { category: 'D', value: 16 },
];

/** 等差数据：用于观察常见连续数值在两种径向映射下的差异 */
export const evenSteps: Array<Record<string, string | number>> = [
  { category: 'A', value: 1 },
  { category: 'B', value: 2 },
  { category: 'C', value: 3 },
  { category: 'D', value: 4 },
];

/** 四季降水量：提供更接近真实业务分布的对照数据 */
export const rainfall: Array<Record<string, string | number>> = [
  { category: 'Spring', value: 18 },
  { category: 'Summer', value: 64 },
  { category: 'Autumn', value: 40 },
  { category: 'Winter', value: 9 },
];
