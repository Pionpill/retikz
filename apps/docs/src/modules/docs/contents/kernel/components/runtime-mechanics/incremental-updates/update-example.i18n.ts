import type { Lang } from '@/i18n';

/** 改色前后对照图的文案 */
export const updateExampleI18n: Record<Lang, { before: string; after: string; change: string }> = {
  zh: { before: '已提交：A 为橙色', after: '下一份结果：A 为蓝色', change: '只改 A.fill；B 保持不变' },
  en: { before: 'Committed: orange A', after: 'Next result: blue A', change: 'Change A.fill; retain B' },
};
