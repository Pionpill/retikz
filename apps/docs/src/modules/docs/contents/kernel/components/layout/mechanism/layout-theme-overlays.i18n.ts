import type { Lang } from '@/i18n';

export const layoutThemeOverlaysI18n = {
  zh: {
    source: '覆盖顺序 ↓',
    provider: 'ThemeProvider',
    input: '输入场景',
    result: '最终主题',
    inherited: '保留 Provider',
    overridden: '由 Layout 覆盖',
    omitted: '— 表示未提供字段，继续使用前面的值',
  },
  en: {
    source: 'Order ↓',
    provider: 'ThemeProvider',
    input: 'Input scene',
    result: 'Final theme',
    inherited: 'From Provider',
    overridden: 'From Layout',
    omitted: '— means omitted: keep the earlier value',
  },
} satisfies Record<Lang, Record<string, string>>;
