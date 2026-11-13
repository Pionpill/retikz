import type { Lang } from '@/i18n';

/** 示例控件文案 */
export const lineMappingI18n = {
  zh: {
    data: '数据',
    currentData: '当前数据',
    sourceData: '原始数据',
    settings: '折线配置',
    series: '区分系列',
    shuffle: '打乱输入顺序',
  },
  en: {
    data: 'Data',
    currentData: 'Current data',
    sourceData: 'Source data',
    settings: 'Line settings',
    series: 'Separate series',
    shuffle: 'Shuffle input',
  },
} satisfies Record<Lang, Record<string, string>>;
