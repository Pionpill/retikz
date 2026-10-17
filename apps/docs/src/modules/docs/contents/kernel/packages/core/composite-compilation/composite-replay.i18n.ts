import type { Lang } from '@/i18n';

/** 重放后的输出结构文案 */
export const compositeReplayI18n: Record<
  Lang,
  { output: string; handle: string; group: string; path: string; note: string }
> = {
  zh: {
    output: '父项返回的 children',
    handle: '输出句柄 H1 · 关联记录摘录',
    group: '父图元数组中的 group',
    path: 'group.children[0] · 子路径',
    note: '局部端点 [0, 0] → [100, 0] · 最终位置 [20, 30] → [120, 30]',
  },
  en: {
    output: 'Children returned by parent',
    handle: 'Handle H1 · associated record',
    group: 'Group in parent primitives',
    path: 'group.children[0] · Child path',
    note: 'Local [0, 0] → [100, 0] · Placed [20, 30] → [120, 30]',
  },
};
