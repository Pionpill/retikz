import type { Lang } from '@/i18n';
/** 映射示例的双语文案 */
export const regressionEncodingsI18n: Record<Lang, { title: string; data: string; samples: string; group: string }> = {
  zh: {
    title: '回归映射',
    data: '数据',
    samples: '观测数据',
    group: '按物种分别拟合',
  },
  en: {
    title: 'Regression mappings',
    data: 'Data',
    samples: 'Observations',
    group: 'Fit each species separately',
  },
};
