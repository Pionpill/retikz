import type { Lang } from '@/i18n';

/** 编译产物示意图文案 */
export const outputCanvasI18n: Record<Lang, { titles: Array<string>; note: string }> = {
  zh: {
    titles: ['自动画布 · padding 10', '显式 viewBox'],
    note: '卡片世界位置保持不变',
  },
  en: {
    titles: ['Automatic · padding 10', 'Explicit viewBox'],
    note: 'Card positions stay unchanged',
  },
};
