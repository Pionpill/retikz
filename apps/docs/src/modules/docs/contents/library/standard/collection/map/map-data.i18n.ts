import type { Lang } from '@/i18n';

/** JSON 数据展开的双语面板文案 */
export const mapDataI18n = {
  zh: {
    title: '嵌套数据展开',
    dataExpand: '展开结构',
    all: '对象与数组',
    none: '全部显示为文本',
    map: '仅对象',
    array: '仅数组',
  },
  en: {
    title: 'Nested data expansion',
    dataExpand: 'Expanded structures',
    all: 'Objects and arrays',
    none: 'All as text',
    map: 'Objects only',
    array: 'Arrays only',
  },
} satisfies Record<Lang, Record<string, string>>;
