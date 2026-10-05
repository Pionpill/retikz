import type { Lang } from '@/i18n';

/** 提交历史示例文案 */
export const branchHistoryI18n: Record<Lang, { title: string; initial: string; fix: string; merge: string }> = {
  zh: { title: '提交历史', initial: 'a1 · 初始化', fix: 'b2 · 修复', merge: 'c3 · 合并' },
  en: { title: 'Commit history', initial: 'a1 · Initial', fix: 'b2 · Fix', merge: 'c3 · Merge' },
};
