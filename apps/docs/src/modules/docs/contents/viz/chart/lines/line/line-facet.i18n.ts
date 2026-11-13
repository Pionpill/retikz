import type { Lang } from '@/i18n';

/** 示例控件文案 */
export const lineFacetI18n = {
  zh: { data: '数据', settings: '折线配置', facet: '按系列分面', header: '显示分面标题' },
  en: { data: 'Data', settings: 'Line settings', facet: 'Facet by series', header: 'Show facet headers' },
} satisfies Record<Lang, Record<string, string>>;
