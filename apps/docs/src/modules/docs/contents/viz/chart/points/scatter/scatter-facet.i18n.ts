import type { Lang } from '@/i18n';

/** 分面散点示例的可见文案 */
export const scatterFacetI18n: Record<Lang, { title: string; subtitle: string; data: string }> = {
  zh: {
    title: '按收入组比较分布',
    subtitle: '2022 年；HIC 高收入、UMC 中高收入、LMC 中低收入、LIC 低收入',
    data: '经济体数据',
  },
  en: {
    title: 'Compare distributions by income group',
    subtitle: '2022; HIC high, UMC upper-middle, LMC lower-middle, LIC low income',
    data: 'Economy data',
  },
};
