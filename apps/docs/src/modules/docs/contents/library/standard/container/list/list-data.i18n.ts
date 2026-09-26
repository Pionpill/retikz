import type { Lang } from '@/i18n';

/** JSON 数据示例的双语面板文案 */
export const listDataI18n = {
  zh: {
    title: 'JSON 数据展示',
    dataObjectDisplay: '对象展示方式',
    map: 'Map',
    text: '文本',
  },
  en: {
    title: 'JSON data display',
    dataObjectDisplay: 'Object display mode',
    map: 'Map',
    text: 'Text',
  },
} satisfies Record<Lang, Record<string, string>>;
