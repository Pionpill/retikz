import type { Lang } from '@/i18n';

/** List 单格宽度与索引带示意图的双语文字 */
export const listMeasurementFigureI18n: Record<Lang, { auto: string; content: string; short: string; long: string }> = {
  zh: {
    auto: 'auto：统一最大宽度',
    content: 'content：逐格内容宽度',
    short: 'A',
    long: 'BBBB',
  },
  en: {
    auto: 'auto: shared maximum width',
    content: 'content: per-cell width',
    short: 'A',
    long: 'BBBB',
  },
};
