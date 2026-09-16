import type { Lang } from '@/i18n';

/** Theme control labels shared by both languages */
export const themeInheritanceI18n: Record<
  Lang,
  {
    title: string;
    style: string;
    mode: string;
    academic: string;
    vibrant: string;
    clean: string;
    default: string;
    light: string;
    dark: string;
  }
> = {
  zh: {
    title: '主题配置',
    style: '主题风格',
    mode: '明暗模式',
    academic: '学术',
    vibrant: '活力',
    clean: '简洁',
    default: '默认',
    light: '浅色',
    dark: '深色',
  },
  en: {
    title: 'Theme configuration',
    style: 'Theme style',
    mode: 'Color mode',
    academic: 'Academic',
    vibrant: 'Vibrant',
    clean: 'Clean',
    default: 'Default',
    light: 'Light',
    dark: 'Dark',
  },
};
