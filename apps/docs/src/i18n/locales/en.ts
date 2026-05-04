import type { I18nResources } from './zh';

/** English copy. Structure mirrors zh.ts; keep keys in sync. */
export const en: I18nResources = {
  common: {
    search: 'Search this section...',
    pageCount: '{{count}} page(s)',
    notFound: 'Not found: /{{section}}/{{page}}',
    versionTag: 'v0.1 alpha',
    contentPlaceholder: '{{title}} — v0.1 alpha content coming soon.',
    github: 'GitHub',
    githubRepo: 'Pionpill/retikz',
    switchLanguage: 'Switch language',
    themeLight: 'Light theme',
    themeDark: 'Dark theme',
    brandTagline: 'TikZ-style drawing library for React',
  },
  core: {
    label: 'Core',
    intro: 'Intro & Install',
  },
};
