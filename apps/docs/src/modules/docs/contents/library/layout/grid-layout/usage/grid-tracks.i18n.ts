import type { Lang } from '@/i18n';

/** 功能面板的双语文案 */
export const demoI18n = {
  zh: { title: '列轨道与间距', width: '容器宽度', factor: '末列份额', gap: '列间距', padding: '内边距' },
  en: {
    title: 'Columns and spacing',
    width: 'Container width',
    factor: 'Last column weight',
    gap: 'Column gap',
    padding: 'Padding',
  },
} satisfies Record<Lang, Record<string, string>>;
