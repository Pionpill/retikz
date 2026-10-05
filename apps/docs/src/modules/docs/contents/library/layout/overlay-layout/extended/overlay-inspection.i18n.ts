import type { Lang } from '@/i18n';

/** 功能面板的双语文案 */
export const demoI18n = {
  zh: {
    title: '检查布局结果',
    width: '容器宽度',
    slots: '显示槽位',
    allocation: '显示真实占用',
    details: '显示布局线索',
  },
  en: {
    title: 'Inspect layout results',
    width: 'Container width',
    slots: 'Show slots',
    allocation: 'Show allocations',
    details: 'Show layout guides',
  },
} satisfies Record<Lang, Record<string, string>>;
