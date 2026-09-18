import type { Lang } from '@/i18n';

export const layoutAutoViewportI18n = {
  zh: {
    bounds: '内容布局边界',
    boundsNote: '存在边界时',
    padding: '四边扩展',
    paddingNote: '默认每边 10',
    viewport: '自动视窗',
    viewportNote: '原点外移，宽高增大',
  },
  en: {
    bounds: 'Content bounds',
    boundsNote: 'When bounds exist',
    padding: 'Expand four sides',
    paddingNote: 'Default: 10 per side',
    viewport: 'Auto viewport',
    viewportNote: 'Shift origin; enlarge size',
  },
} satisfies Record<Lang, Record<string, string>>;
