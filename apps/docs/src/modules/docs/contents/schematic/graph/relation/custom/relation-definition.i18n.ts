import type { Lang } from '@/i18n';
/** 反馈关系示例文案 */
export const relationDefinitionI18n: Record<Lang, { review: string; revise: string }> = {
  zh: { review: '审核', revise: '修订' },
  en: { review: 'Review', revise: 'Revise' },
};
