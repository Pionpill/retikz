import type { Lang } from '@/i18n';

/** 路径回填状态图的双语文案 */
export const compilationSlotsI18n: Record<
  Lang,
  Record<'source' | 'pending' | 'final' | 'path' | 'slot' | 'compile' | 'replace', string>
> = {
  zh: {
    source: '输入 children',
    pending: '遍历结束，路径尚未回填',
    final: '回填后的 primitives',
    path: 'Path A → B',
    slot: '路径占位',
    compile: '遍历子项',
    replace: '解析 A、B，替换第 0 项',
  },
  en: {
    source: 'Input children',
    pending: 'After traversal, before path emission',
    final: 'Primitives after emission',
    path: 'Path A → B',
    slot: 'Path slot',
    compile: 'Traverse children',
    replace: 'Resolve A and B; replace slot 0',
  },
};
