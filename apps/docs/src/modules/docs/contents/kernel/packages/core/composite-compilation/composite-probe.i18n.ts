import type { Lang } from '@/i18n';

/** 隔离试算数据结构文案 */
export const compositeProbeI18n: Record<
  Lang,
  { results: Array<string>; transactions: string; detail: string; parent: string; note: string }
> = {
  zh: {
    results: ['自然提案结果 · 字段摘录', '固定宽 60 的结果 · 字段摘录'],
    transactions: '会话 WeakMap · replayTransactions',
    detail: 'T1 对应事务 · 字段摘录',
    parent: '父图元数组 · 两次试算后仍未加入子项',
    note: '连线表示引用 · T0、T1 仅在当前回调与编译内有效',
  },
  en: {
    results: ['Natural result · excerpt', 'Exact-60 result · excerpt'],
    transactions: 'Session WeakMap · replayTransactions',
    detail: 'Transaction for T1 · excerpt',
    parent: 'Parent primitives · Child absent after both probes',
    note: 'Lines denote references · T0 and T1 belong to this callback and compile',
  },
};
