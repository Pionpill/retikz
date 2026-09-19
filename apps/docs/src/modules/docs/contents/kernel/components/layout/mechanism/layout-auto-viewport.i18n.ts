import type { Lang } from '@/i18n';

export const layoutAutoViewportI18n = {
  zh: {
    bounds: '内容布局边界',
    boundsNote: '(20, 30, 80, 40)',
    padding: '四边扩展',
    paddingNote: 'padding = 10',
    viewport: '自动视窗',
    viewportNote: '(10, 20, 100, 60)',
  },
  en: {
    bounds: 'Content bounds',
    boundsNote: '(20, 30, 80, 40)',
    padding: 'Expand four sides',
    paddingNote: 'padding = 10',
    viewport: 'Auto viewport',
    viewportNote: '(10, 20, 100, 60)',
  },
} satisfies Record<Lang, Record<string, string>>;
