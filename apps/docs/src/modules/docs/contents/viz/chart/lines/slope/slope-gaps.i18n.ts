import type { Lang } from '@/i18n';

/** 示例控件文案 */
export const slopeGapsI18n: Record<
  Lang,
  { currentData: string; sourceData: string; data: string; settings: string; missing: string; label: string }
> = {
  zh: {
    data: '数据',
    currentData: '当前数据',
    sourceData: '原始数据',
    settings: '设置',
    missing: '移除 B 的起点',
    label: '显示标签',
  },
  en: {
    data: 'Data',
    currentData: 'Current data',
    sourceData: 'Source data',
    settings: 'Settings',
    missing: 'Remove B start',
    label: 'Show labels',
  },
};
