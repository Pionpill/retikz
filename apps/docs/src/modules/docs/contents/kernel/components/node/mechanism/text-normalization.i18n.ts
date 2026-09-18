import type { Lang } from '@/i18n';

export const textNormalizationI18n: Record<Lang, Array<string>> = {
  zh: ['text 或 children', 'text 优先', '整理为行数组', 'Node.text'],
  en: ['text or children', 'text wins', 'Collect lines', 'Node.text'],
};
