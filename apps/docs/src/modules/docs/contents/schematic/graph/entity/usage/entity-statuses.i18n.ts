import type { Lang } from '@/i18n';

/** 内置状态平铺示例的实体文字 */
export const entityStatusesI18n: Record<Lang, ReadonlyArray<string>> = {
  zh: ['正常', '错误', '成功', '警告', '禁用'],
  en: ['Default', 'Error', 'Success', 'Warning', 'Disabled'],
};
