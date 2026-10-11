import type { Lang } from '@/i18n';

/** 图内标注与控制面板的同源双语文案 */
export const transformDemoI18n = {
  zh: {
    empty: '没有输出记录',
    ends: '首行到末行',
    extrema: '最小到最大',
    global: '不分组',
    grouped: '按 team 分组',
    measure: '输出差值列',
    pair: '端点选择',
    result: '变换结果',
    source: '原始记录',
    relation_relate: '关系生成',
  },
  en: {
    empty: 'No output rows',
    ends: 'First to last',
    extrema: 'Minimum to maximum',
    global: 'No grouping',
    grouped: 'Group by team',
    measure: 'Include difference column',
    pair: 'Endpoint selection',
    result: 'Transformed rows',
    source: 'Original rows',
    relation_relate: 'Generate relations',
  },
} satisfies Record<Lang, Record<string, string>>;
