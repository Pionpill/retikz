import type { Lang } from '@/i18n';

/** 自定义宽度曲线试验场的双语文案 */
export const ribbonCustomProfileI18n: Record<Lang, { title: string; base: string; peak: string }> = {
  zh: { title: '自定义宽度曲线', base: '基础宽度', peak: '峰值宽度' },
  en: { title: 'Custom width profile', base: 'Base width', peak: 'Peak width' },
};
