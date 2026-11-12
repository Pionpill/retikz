import type { Lang } from '@/i18n';

/** 示例控件文案 */
export const lineMappingI18n = {
  zh: {
    settings: '折线配置',
    series: '区分系列',
    shuffle: '打乱输入顺序',
  },
  en: {
    settings: 'Line settings',
    series: 'Separate series',
    shuffle: 'Shuffle input',
  },
} satisfies Record<Lang, Record<string, string>>;
