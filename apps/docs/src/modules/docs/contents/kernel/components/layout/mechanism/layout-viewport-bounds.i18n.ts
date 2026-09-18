import type { Lang } from '@/i18n';

export const layoutViewportBoundsI18n = {
  zh: {
    bounds: '灰色虚线：内容边界 (20, 30, 80, 40)',
    viewport: '橙色实线：视窗 (10, 20, 100, 60)',
    padding: '四边各留 10 个绘图单位',
  },
  en: {
    bounds: 'Dashed: content bounds (20, 30, 80, 40)',
    viewport: 'Orange: viewport (10, 20, 100, 60)',
    padding: '10 drawing units on each side',
  },
} satisfies Record<Lang, Record<string, string>>;
