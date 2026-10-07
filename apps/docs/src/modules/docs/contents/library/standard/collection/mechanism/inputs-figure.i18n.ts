import type { Lang } from '@/i18n';

/** 图示双语文案 */
export const inputsFigureI18n: Record<Lang, { data: string; items: string; skeleton: string; result: string }> = {
  zh: {
    data: 'JSON 数据',
    items: '显式条目',
    skeleton: '带标签的骨架',
    result: 'CanonicalCell 字段摘录（第一格）',
  },
  en: {
    data: 'JSON data',
    items: 'Explicit items',
    skeleton: 'Labeled skeleton',
    result: 'CanonicalCell excerpt (first cell)',
  },
};
