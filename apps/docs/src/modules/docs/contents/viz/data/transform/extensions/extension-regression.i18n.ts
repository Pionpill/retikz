import type { Lang } from '@/i18n';

/** 自定义拟合控件与坐标文案 */
export const extensionRegressionI18n: Record<
  Lang,
  { title: string; data: string; source: string; result: string; offset: string; x: string; y: string }
> = {
  zh: {
    title: '过原点拟合',
    data: '数据',
    source: '观测点',
    result: '预测点',
    offset: '观测值偏移',
    x: '自变量 x',
    y: '观测与预测 y',
  },
  en: {
    title: 'Fit through origin',
    data: 'Data',
    source: 'Observations',
    result: 'Predictions',
    offset: 'Observation offset',
    x: 'Independent x',
    y: 'Observed and predicted y',
  },
};
