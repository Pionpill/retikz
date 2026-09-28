import type { Lang } from '@/i18n';

/** 自定义拟合示例的双语文案 */
export const regressionCustomI18n: Record<Lang, { settings: string; data: string; slope: string }> = {
  zh: { settings: '固定斜率拟合', data: '观测数据', slope: '斜率' },
  en: { settings: 'Fixed-slope fitting', data: 'Observations', slope: 'Slope' },
};
