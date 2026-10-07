import type { Lang } from '@/i18n';

/** Array 等宽等高示例的双语文案 */
export const arraySizingFigureI18n: Record<Lang, { before: string; after: string; operation: string }> = {
  zh: { before: '逐格测量（含内边距）', after: '统一分配：每格 96 × 52', operation: '宽、高分别取最大值' },
  en: {
    before: 'Individual needs (with padding)',
    after: 'Allocate 96 × 52 to each cell',
    operation: 'Max width, max height',
  },
};
