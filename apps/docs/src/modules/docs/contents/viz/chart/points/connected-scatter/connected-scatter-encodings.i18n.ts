import type { Lang } from '@/i18n';

/** 映射示例的双语文案 */
export const connectedScatterEncodingsI18n: Record<Lang, { title: string; data: string; samples: string }> = {
  zh: {
    title: '连接散点映射',
    data: '数据',
    samples: '观测数据',
  },
  en: {
    title: 'Connected scatter mappings',
    data: 'Data',
    samples: 'Observations',
  },
};
