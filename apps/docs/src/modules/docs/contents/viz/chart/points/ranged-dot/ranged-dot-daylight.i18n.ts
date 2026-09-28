import type { Lang } from '@/i18n';

/** 环形白昼示例的双语控件文案 */
export const rangedDotDaylightI18n = {
  zh: {
    title: '白昼时段',
    data: '数据',
    sample: '东京隔月日出日落',
  },
  en: {
    title: 'Daylight hours',
    data: 'Data',
    sample: 'Tokyo sunrise and sunset',
  },
} satisfies Record<Lang, Record<string, string>>;
