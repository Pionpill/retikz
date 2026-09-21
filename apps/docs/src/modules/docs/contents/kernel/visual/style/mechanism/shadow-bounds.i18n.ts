import type { Lang } from '@/i18n';
/** 同一矩形的边界对照文案 */
export const shadowBoundsI18n: Record<Lang, { titles: Array<string>; notes: Array<string> }> = {
  zh: {
    titles: ['原几何', '位移与模糊', '可见范围估算'],
    notes: ['100 × 60', 'dx = 12, dy = 8, blur = 6', '124 × 80'],
  },
  en: {
    titles: ['Geometry', 'Offset and blur', 'Estimated extent'],
    notes: ['100 × 60', 'dx = 12, dy = 8, blur = 6', '124 × 80'],
  },
};
