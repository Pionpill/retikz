/** 内置拟合方法提示；实际可用方法由当前 registry 决定 */
export const BuiltinRegressionMethod = {
  Linear: 'linear',
  Quadratic: 'quadratic',
  Polynomial: 'polynomial',
  Logarithmic: 'logarithmic',
  Exponential: 'exponential',
  Power: 'power',
} as const;
