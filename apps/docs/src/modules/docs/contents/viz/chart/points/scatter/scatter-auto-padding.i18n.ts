import type { Lang } from '@/i18n';

/** 自动留白策略对比文案 */
export const scatterAutoPaddingI18n: Record<Lang, { maximum: string; aware: string; subtitle: string }> = {
  zh: { maximum: '最大半径 · 默认', aware: '逐点紧凑 · 可选', subtitle: '相同数据与点大小；中央大点、边缘小点' },
  en: {
    maximum: 'Maximum radius · default',
    aware: 'Point-aware · opt-in',
    subtitle: 'Same data and sizes; large center, small edge points',
  },
};
