import type { Lang } from '@/i18n';

/** 功能面板的双语文案 */
export const demoI18n = {
  zh: { title: '行列放置', autoFlow: '自动排列方向', autoFlow0: '按行排列', autoFlow1: '按列排列', span: '首项跨列' },
  en: {
    title: 'Cell placement',
    autoFlow: 'Auto-placement direction',
    autoFlow0: 'By row',
    autoFlow1: 'By column',
    span: 'First item column span',
  },
} satisfies Record<Lang, Record<string, string>>;
