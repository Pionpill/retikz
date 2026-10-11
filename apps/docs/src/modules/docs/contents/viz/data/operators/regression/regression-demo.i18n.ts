import type { Lang } from '@/i18n';

/** 六种拟合 demo 的控件、坐标与表格说明 */
export const regressionDemoI18n: Record<
  Lang,
  {
    title: string;
    display: string;
    graph: string;
    table: string;
    source: string;
    result: string;
    originalX: string;
    order: string;
    samples: string;
    tail: string;
    x: string;
    y: string;
  }
> = {
  zh: {
    title: '拟合与采样',
    display: '展示方式',
    graph: '图形',
    table: '表格',
    source: '观测点',
    result: '拟合结果',
    originalX: '原始 x',
    order: '多项式阶数',
    samples: '采样点数',
    tail: '末次观测值',
    x: '自变量 x',
    y: '观测与预测 y',
  },
  en: {
    title: 'Fit and sample',
    display: 'Display',
    graph: 'Graph',
    table: 'Table',
    source: 'Observations',
    result: 'Fitted values',
    originalX: 'Original x',
    order: 'Polynomial degree',
    samples: 'Sample count',
    tail: 'Last observation',
    x: 'Independent x',
    y: 'Observed and predicted y',
  },
};
