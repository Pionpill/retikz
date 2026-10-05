import type { Lang } from '@/i18n';

/** 映射示例的双语文案 */
export const rangedDotEncodingsI18n: Record<Lang, { title: string; data: string; samples: string; reverse: string }> = {
  zh: {
    title: '范围点映射',
    data: '数据',
    samples: '观测数据',
    reverse: '交换起终点字段',
  },
  en: {
    title: 'Ranged dot mappings',
    data: 'Data',
    samples: 'Observations',
    reverse: 'Swap start and end fields',
  },
};
