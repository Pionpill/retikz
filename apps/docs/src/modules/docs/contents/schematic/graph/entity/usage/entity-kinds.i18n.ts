import type { Lang } from '@/i18n';

/** 自定义 kind 平铺示例的实体文字 */
export const entityKindsI18n: Record<Lang, ReadonlyArray<string>> = {
  zh: ['常规任务', '重点任务', '受阻任务'],
  en: ['Routine', 'Priority', 'Blocked'],
};
