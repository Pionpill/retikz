import type { Lang } from '@/i18n';

export const nodeSizeStatesI18n: Record<Lang, { stages: Array<string>; padding: string; label: string }> = {
  zh: { stages: ['文字内容', '加入内边距', '附加标签'], padding: 'padding = 12', label: 'label' },
  en: { stages: ['Text content', 'Add padding', 'Attach label'], padding: 'padding = 12', label: 'label' },
};
