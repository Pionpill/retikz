import type { Lang } from '@/i18n';

export const themeResolutionI18n: Record<Lang, { input: string; process: string; output: string; scene: string }> = {
  zh: {
    input: 'resolveTheme\n继承 style / mode',
    process: 'resolveCoreThemeStyleColors\n生成共享颜色',
    output: 'expand / compile\n消费 context.theme',
    scene: 'Scene\n保留明确样式',
  },
  en: {
    input: 'resolveTheme\nInherit style / mode',
    process: 'resolveCoreThemeStyleColors\nResolve shared colors',
    output: 'expand / compile\nConsume context.theme',
    scene: 'Scene\nKeep explicit styles',
  },
};
