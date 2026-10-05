import type { Lang } from '@/i18n';

/** 最小结构块示例文案 */
export const blockMinimalI18n: Record<Lang, { description: string; fields: string }> = {
  zh: { description: '领域实体', fields: '字段' },
  en: { description: 'Domain entity', fields: 'Fields' },
};
