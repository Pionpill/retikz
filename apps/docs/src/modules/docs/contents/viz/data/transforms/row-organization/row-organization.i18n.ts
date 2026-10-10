import type { Lang } from '@/i18n';

/** 行组织演示及控制面板的双语文案 */
export const rowOrganizationI18n = {
  zh: {
    sortTitle: '排序',
    selectTitle: '选择原始行',
    field: '排序字段',
    order: '排序方向',
    ascending: '升序',
    descending: '降序',
    group: '计算分组',
    global: '不分组',
    ranked: '输出排名列',
    source: '原始记录',
    sorted: '排序结果',
    selected: '选中记录',
    allRows: '全部记录',
    empty: '没有选中记录',
  },
  en: {
    sortTitle: 'Sort',
    selectTitle: 'Select original rows',
    field: 'Sort field',
    order: 'Sort direction',
    ascending: 'Ascending',
    descending: 'Descending',
    group: 'Calculation group',
    global: 'No grouping',
    ranked: 'Include rank column',
    source: 'Original rows',
    sorted: 'Sorted rows',
    selected: 'Selected rows',
    allRows: 'All rows',
    empty: 'No rows selected',
  },
} satisfies Record<Lang, Record<string, string>>;
