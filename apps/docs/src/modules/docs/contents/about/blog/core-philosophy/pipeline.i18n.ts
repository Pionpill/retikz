import type { Lang } from '@/i18n';

export const pipelineI18n: Record<Lang, Readonly<Record<'persist' | 'planned', string>>> = {
  zh: {
    persist: '持久化 / 编辑',
    planned: '灰色在计划中，但尚未支持',
  },
  en: {
    persist: 'persistence / edit',
    planned: 'Gray items are planned but not yet supported',
  },
};
