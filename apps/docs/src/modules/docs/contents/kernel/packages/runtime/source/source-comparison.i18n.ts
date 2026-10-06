import type { Lang } from '@/i18n';

/** 状态比较图的文案 */
export const sourceComparisonI18n: Record<
  Lang,
  { previous: string; next: string; compare: string; equal: string; changed: string }
> = {
  zh: {
    previous: '旧内部值\n[10, 20]',
    next: '新内部值 · capture 后\n[10, 20] 或 [13, 20]',
    compare: 'equals\n坐标相同？',
    equal: '保留旧状态\n清理候选值',
    changed: '候选值参与更新\n发布成功后替换旧状态',
  },
  en: {
    previous: 'Previous internal value\n[10, 20]',
    next: 'Next internal value · after capture\n[10, 20] or [13, 20]',
    compare: 'equals\nSame coordinates?',
    equal: 'Keep previous state\nClean up candidate',
    changed: 'Candidate enters update\nReplace old state after publication',
  },
};
