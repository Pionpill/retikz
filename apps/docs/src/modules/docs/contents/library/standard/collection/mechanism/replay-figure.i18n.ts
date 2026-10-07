import type { Lang } from '@/i18n';

/** 图示双语文案 */
export const replayFigureI18n: Record<Lang, { roomy: string; visible: string; clip: string; unchanged: string }> = {
  zh: {
    roomy: '分配 120 × 60',
    visible: '分配 60 × 60 · visible',
    clip: '分配 60 × 60 · clip',
    unchanged: 'Bbbb 的已测内容始终为 80 × 36；改变的是放置与裁切',
  },
  en: {
    roomy: 'Allocation 120 × 60',
    visible: '60 × 60 · visible',
    clip: '60 × 60 · clip',
    unchanged: 'Bbbb stays 80 × 36; only placement and clipping change',
  },
};
