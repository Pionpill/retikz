import type { Lang } from '@/i18n';

/** 数据绑定示例的公共文案 */
export const annotationDataI18n: Record<
  Lang,
  {
    data: string;
    observations: string;
    binding: string;
    grouped: string;
    statistic: string;
    mean: string;
    median: string;
    fullX: string;
    point: string;
    path: string;
    interval: string;
  }
> = {
  zh: {
    data: '输入数据',
    observations: '观测值',
    binding: '聚合与位置',
    grouped: '按 group 分组',
    statistic: '统计量',
    mean: '平均值',
    median: '中位数',
    fullX: '横向使用整个视图范围',
    point: '聚合参考点',
    path: '统计参考线',
    interval: '数据范围区域',
  },
  en: {
    data: 'Input data',
    observations: 'Observations',
    binding: 'Aggregation and positions',
    grouped: 'Group by group',
    statistic: 'Statistic',
    mean: 'Mean',
    median: 'Median',
    fullX: 'Span the full horizontal view',
    point: 'Aggregate reference points',
    path: 'Statistical reference lines',
    interval: 'Data extent regions',
  },
};
