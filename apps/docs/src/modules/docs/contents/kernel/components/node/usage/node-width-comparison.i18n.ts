import type { Lang } from '@/i18n';

/** 宽度对照使用相同的短文本与长文本 */
export const nodeWidthComparisonI18n: Record<Lang, { short: string; long: string }> = {
  zh: { short: '就绪', long: '发布之前，请先检查这份文档' },
  en: { short: 'Ready', long: 'Review the draft before publishing' },
};
