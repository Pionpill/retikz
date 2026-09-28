import type { Lang } from '@/i18n';
/** 功能面板的双语文案 */
export const demoI18n = {
  zh: {
    title: '隐式轨道',
    start: '首项起始行',
    height: '隐式行高',
    autoFlow: '自动排列方向',
    autoFlow0: '按行排列',
    autoFlow1: '按列排列',
  },
  en: {
    title: 'Implicit tracks',
    start: 'First item row start',
    height: 'Implicit row height',
    autoFlow: 'Auto-placement direction',
    autoFlow0: 'By row',
    autoFlow1: 'By column',
  },
} satisfies Record<Lang, Record<string, string>>;
