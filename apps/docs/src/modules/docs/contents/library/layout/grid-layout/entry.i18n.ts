import type { Lang } from '@/i18n';

/** GridLayout 入口示例文案 */
export const entryI18n: Record<Lang, { heading: string; fixed: string; one: string; two: string }> = {
  zh: { heading: '跨三列的标题', fixed: '固定列', one: '1 份', two: '2 份' },
  en: { heading: 'Heading across three columns', fixed: 'Fixed', one: '1 share', two: '2 shares' },
};
