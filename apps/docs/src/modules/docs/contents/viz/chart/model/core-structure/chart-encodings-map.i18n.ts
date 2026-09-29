import type { Lang } from '@/i18n';

/** 数据字段到图形通道的示意图文案 */
export const chartEncodingsMapI18n: Record<Lang, Readonly<{ data: string; encodings: string; mark: string }>> = {
  zh: { data: 'data · 一条记录', encodings: 'recipe.encodings', mark: 'Scatter 图元通道' },
  en: { data: 'data · one row', encodings: 'recipe.encodings', mark: 'Scatter mark channels' },
};
