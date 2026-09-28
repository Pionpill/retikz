import type { Lang } from '@/i18n';
/** 示例的双语标题与读图说明 */
export const stripPlacementFigureI18n: Record<Lang, { title: string; subtitle: string }> = {
  zh: { title: '散布改变横向位置，纵向数值不变', subtitle: '18 条观测仍位于 1、2、3 三条数值线上' },
  en: {
    title: 'Jitter moves points horizontally, never vertically',
    subtitle: 'All 18 observations stay on the three value levels: 1, 2 and 3',
  },
};
