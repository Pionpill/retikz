import type { Lang } from '@/i18n';

/** 示例的双语标题与读图说明 */
export const regressionObservationsFigureI18n: Record<Lang, { title: string; subtitle: string }> = {
  zh: { title: '观测点没有被拟合值替换', subtitle: '蓝点保持原始数据；橙线连接独立生成的预测采样' },
  en: {
    title: 'Fitted values do not replace observations',
    subtitle: 'Blue points retain source values; the orange line joins generated predictions',
  },
};
