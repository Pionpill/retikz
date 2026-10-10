import type { Lang } from '@/i18n';

/** 图例、坐标与两组控件的可见文案 */
export const regressionDemoI18n: Record<
  Lang,
  {
    title: string;
    data: string;
    settings: string;
    source: string;
    result: string;
    method: string;
    order: string;
    samples: string;
    tail: string;
    x: string;
    y: string;
    linear: string;
    quadratic: string;
    polynomial: string;
    logarithmic: string;
    exponential: string;
    power: string;
  }
> = {
  zh: {
    title: '拟合与采样',
    data: '数据',
    settings: '计算',
    source: '观测点',
    result: '预测点',
    method: '拟合方法',
    order: '多项式阶数',
    samples: '采样点数',
    tail: '末次观测值',
    x: '自变量 x',
    y: '观测与预测 y',
    linear: '线性',
    quadratic: '二次',
    polynomial: '多项式',
    logarithmic: '对数',
    exponential: '指数',
    power: '幂函数',
  },
  en: {
    title: 'Fit and sample',
    data: 'Data',
    settings: 'Computation',
    source: 'Observations',
    result: 'Predictions',
    method: 'Fitting method',
    order: 'Polynomial degree',
    samples: 'Sample count',
    tail: 'Last observation',
    x: 'Independent x',
    y: 'Observed and predicted y',
    linear: 'Linear',
    quadratic: 'Quadratic',
    polynomial: 'Polynomial',
    logarithmic: 'Logarithmic',
    exponential: 'Exponential',
    power: 'Power',
  },
};
