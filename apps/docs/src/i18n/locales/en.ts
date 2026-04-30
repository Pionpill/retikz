import type { Resources } from './zh';

/** English copy. Structure mirrors zh.ts; keep keys in sync. */
export const en: Resources = {
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
  sections: {
    core: 'Core',
    plot: 'Plot',
    flow: 'Flow',
  },
  pages: {
    'core-intro': 'Intro & Install',
    'plot-intro': 'Intro (v0.2)',
    'flow-intro': 'Intro (v0.3+)',
  },
};
