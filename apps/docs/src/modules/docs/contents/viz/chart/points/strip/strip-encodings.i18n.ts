import type { Lang } from '@/i18n';

/** 映射示例的双语文案 */
export const stripEncodingsI18n: Record<
  Lang,
  { title: string; data: string; samples: string; role: string; x: string; y: string }
> = {
  zh: {
    title: '条带映射',
    data: '数据',
    samples: '观测数据',
    role: '离散轴',
    x: '横轴',
    y: '纵轴',
  },
  en: {
    title: 'Strip mappings',
    data: 'Data',
    samples: 'Observations',
    role: 'Discrete axis',
    x: 'X axis',
    y: 'Y axis',
  },
};
