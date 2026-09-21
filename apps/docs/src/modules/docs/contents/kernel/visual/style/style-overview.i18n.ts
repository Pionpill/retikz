import type { Lang } from '@/i18n';

/** 样式总览示意图的双语文案 */
export const styleOverviewI18n: Record<Lang, Record<'pattern' | 'shadow' | 'blend', string>> = {
  zh: {
    pattern: 'pattern · 图案',
    shadow: 'shadow · 阴影',
    blend: 'blend · 混合',
  },
  en: {
    pattern: 'pattern · Patterns',
    shadow: 'shadow · Shadows',
    blend: 'blend · Blending',
  },
};
