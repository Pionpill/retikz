import type { Lang } from '@/i18n';

/** 自动留白对照图的可见文案 */
export const scatterPaddingFigureI18n: Record<
  Lang,
  { zero: string; automatic: string; outside: string; inside: string; note: string }
> = {
  zh: {
    zero: '显式零留白',
    automatic: '自动留白',
    outside: '极值点中心落在边界上',
    inside: '极值点中心向内留出半径 r',
    note: '相同数据、点半径和绘图区尺寸；实线框为绘图区边界',
  },
  en: {
    zero: 'Explicit zero padding',
    automatic: 'Automatic padding',
    outside: 'Extreme point centers lie on the boundary',
    inside: 'Extreme point centers sit r inside the boundary',
    note: 'Same data, radius, and plot size; solid frames mark plot boundaries',
  },
};
