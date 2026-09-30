import type { Lang } from '@/i18n';

/** 预计算边界试验场的双语文案 */
export const ribbonBoundaryI18n: Record<Lang, { title: string; sampling: string; offset: string }> = {
  zh: { title: '预计算边界', sampling: '采样数量', offset: '下边界偏移' },
  en: { title: 'Precomputed boundaries', sampling: 'Sample count', offset: 'Lower boundary offset' },
};
