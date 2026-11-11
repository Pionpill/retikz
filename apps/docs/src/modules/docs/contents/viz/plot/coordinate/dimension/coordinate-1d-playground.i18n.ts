import type { Lang } from '@/i18n';

/** 示例与控件文案 */
export const coordinate1DPlaygroundI18n = {
  zh: {
    title: '直线投影',
    data: '数据',
    events: '事件时刻',
    projection: '坐标投影',
    orientation: '直线方向',
    horizontal: '横向',
    vertical: '纵向',
  },
  en: {
    title: 'Linear projection',
    data: 'Data',
    events: 'Event times',
    projection: 'Projection',
    orientation: 'Direction',
    horizontal: 'Horizontal',
    vertical: 'Vertical',
  },
} satisfies Record<Lang, Record<string, string>>;
