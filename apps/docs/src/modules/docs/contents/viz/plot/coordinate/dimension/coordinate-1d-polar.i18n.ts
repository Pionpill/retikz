import type { Lang } from '@/i18n';

/** 示例与控件文案 */
export const coordinate1DPolarI18n = {
  zh: {
    title: '圆形投影',
    data: '数据',
    events: '事件时刻',
    projection: '坐标投影',
    radius: '半径占比',
    startAngle: '起始角度',
    sweepAngle: '扫过角度',
  },
  en: {
    title: 'Circular projection',
    data: 'Data',
    events: 'Event times',
    projection: 'Projection',
    radius: 'Radius ratio',
    startAngle: 'Start angle',
    sweepAngle: 'Sweep angle',
  },
} satisfies Record<Lang, Record<string, string>>;
