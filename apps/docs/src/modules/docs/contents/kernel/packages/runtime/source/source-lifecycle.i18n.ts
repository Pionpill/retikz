import type { Lang } from '@/i18n';

/** 候选状态生命周期图的文案 */
export const sourceLifecycleI18n: Record<
  Lang,
  { prepare: string; compare: string; retire: string; runtime: string; equal: string; changed: string }
> = {
  zh: {
    prepare: 'prepare\n准备新状态',
    compare: 'compare\n完整值相等？',
    retire: 'retire\n清理候选，保留旧值',
    runtime: '交给 Runtime\n成功采用，失败清理',
    equal: '相等',
    changed: '不相等',
  },
  en: {
    prepare: 'prepare\nPrepare next state',
    compare: 'compare\nEqual complete values?',
    retire: 'retire\nDiscard candidate, keep old',
    runtime: 'Hand to Runtime\nAdopt or clean up',
    equal: 'Equal',
    changed: 'Different',
  },
};
