import type { Lang } from '@/i18n';

/** 命名空间栈快照的说明 */
export const namespaceStackI18n: Record<Lang, Record<'root' | 'local' | 'lookup' | 'lifecycle', string>> = {
  zh: {
    root: '栈底 · 根 Map',
    local: '栈顶 · cluster 局部 Map',
    lookup: 'lookup("A") → 栈顶 A',
    lifecycle: 'push / pop 作用于栈顶',
  },
  en: {
    root: 'Bottom · root Map',
    local: 'Top · cluster local Map',
    lookup: 'lookup("A") → top-frame A',
    lifecycle: 'push / pop operate at the top',
  },
};
