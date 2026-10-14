import type { Lang } from '@/i18n';

/** Path 编译三个时点的数据快照文案 */
export const pathTimingI18n: Record<Lang, { stages: Array<string>; record: string; namespace: string; sink: string }> =
  {
    zh: {
      stages: ['1. 遇到 Path P', '2. Scope 子树完成', '3. Path P 回填后'],
      record: '待处理记录 P · 本例所示字段在处理过程中不变',
      namespace: '当前命名空间 Map',
      sink: 'primitiveSink · 图元数组',
    },
    en: {
      stages: ['1. Encounter Path P', '2. Scope subtree complete', '3. After filling Path P'],
      record: 'Record P · shown fields stay unchanged in this example',
      namespace: 'Current namespace Map',
      sink: 'primitiveSink · primitives',
    },
  };
