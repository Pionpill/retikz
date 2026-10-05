import type { Lang } from '@/i18n';

/** 功能面板的双语文案 */
export const demoI18n = {
  zh: { title: '共享区域', width: '容器宽度', height: '容器高度', padding: '内边距' },
  en: { title: 'Shared content box', width: 'Container width', height: 'Container height', padding: 'Padding' },
} satisfies Record<Lang, Record<string, string>>;
