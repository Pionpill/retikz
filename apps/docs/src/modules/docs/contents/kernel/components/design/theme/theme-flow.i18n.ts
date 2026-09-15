import type { Lang } from '@/i18n';

export const themeFlowI18n: Record<Lang, { input: string; process: string; output: string }> = {
  zh: { input: '主题', process: '组合', output: '图元样式' },
  en: { input: 'Theme', process: 'Composite', output: 'Primitive styles' },
};
