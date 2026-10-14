import type { Lang } from '@/i18n';

/** 内容、形状和占位范围图 */
export const layoutBoxesI18n: Record<Lang, { titles: Array<string>; sizes: Array<string>; content: string }> = {
  zh: {
    titles: ['加入 padding', '满足 minimumSize', '加入 margin'],
    sizes: ['56 × 40', '80 × 48', '92 × 60'],
    content: '正文',
  },
  en: {
    titles: ['Add padding', 'Meet minimumSize', 'Add margin'],
    sizes: ['56 × 40', '80 × 48', '92 × 60'],
    content: 'Text',
  },
};
