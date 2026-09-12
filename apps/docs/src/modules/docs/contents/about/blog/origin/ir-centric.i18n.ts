import type { Lang } from '@/i18n';

export const irCentricI18n: Record<Lang, Readonly<Record<'svg' | 'persist', string>>> = {
  zh: {
    svg: '纯 SVG 字符串',
    persist: '持久化 / 编辑',
  },
  en: {
    svg: 'pure SVG string',
    persist: 'persistence / edit',
  },
};
