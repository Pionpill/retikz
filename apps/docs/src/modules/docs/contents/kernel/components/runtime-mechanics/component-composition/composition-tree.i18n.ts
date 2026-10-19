import type { Lang } from '@/i18n';

/** 组合结构图的双语文案 */
export const compositionTreeI18n: Record<Lang, { surface: string; flex: string; title: string; plot: string }> = {
  zh: {
    surface: 'Surface · 内边距与背景',
    flex: 'FlexLayout · 纵向排列',
    title: 'Node · 观测值',
    plot: 'Plot · 三条数据',
  },
  en: {
    surface: 'Surface · padding and background',
    flex: 'FlexLayout · vertical arrangement',
    title: 'Node · Observations',
    plot: 'Plot · three records',
  },
};
