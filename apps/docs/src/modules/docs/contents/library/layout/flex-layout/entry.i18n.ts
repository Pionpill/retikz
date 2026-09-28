import type { Lang } from '@/i18n';

/** FlexLayout 入口示例文案 */
export const entryI18n: Record<Lang, { fixed: string; growOne: string; growTwo: string }> = {
  zh: { fixed: '固定宽度', growOne: '弹性内容 · grow 1', growTwo: '弹性内容 · grow 2' },
  en: { fixed: 'Fixed width', growOne: 'Flexible · grow 1', growTwo: 'Flexible · grow 2' },
};
