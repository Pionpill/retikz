import type { Lang } from '@/i18n';

/** 首张 Plot 的坐标轴文案 */
export const firstPlotI18n: Record<Lang, { time: string; value: string }> = {
  zh: { time: '时间', value: '测量值' },
  en: { time: 'Time', value: 'Reading' },
};
