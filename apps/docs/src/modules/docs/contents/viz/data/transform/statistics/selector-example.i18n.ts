import type { Lang } from '@/i18n';

/** 对照表标题 */
export const selectorExampleI18n: Record<Lang, { before: string; after: string }> = {
  zh: { before: '变换前 · 4 行', after: '变换后 · 2 行' },
  en: { before: 'Before · 4 rows', after: 'After · 2 rows' },
};
