import type { Lang } from '@/i18n';
/** 功能面板的双语文案 */
export const demoI18n = {
  zh: { title: '显式区域与溢出', overlap: '允许显式重叠', overflow: '视觉溢出', overflow0: '可见', overflow1: '裁切' },
  en: {
    title: 'Explicit areas and overflow',
    overlap: 'Allow explicit overlap',
    overflow: 'Visual overflow',
    overflow0: 'Visible',
    overflow1: 'Clip',
  },
} satisfies Record<Lang, Record<string, string>>;
