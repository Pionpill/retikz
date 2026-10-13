import type { Lang } from '@/i18n';

/** 同一正文的宽度与标签对照 */
export const layoutExampleI18n: Record<Lang, { titles: Array<string>; body: string; label: string }> = {
  zh: { titles: ['较宽正文', '收紧正文宽度', '只增加标签'], body: 'Alpha beta gamma delta', label: '附属标签' },
  en: {
    titles: ['Wider content', 'Narrower content', 'Add a label only'],
    body: 'Alpha beta gamma delta',
    label: 'Attached label',
  },
};
