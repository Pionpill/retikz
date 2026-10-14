import type { Lang } from '@/i18n';

/** 接入示例数据视图文案 */
export const transformEntryI18n: Record<Lang, { title: string; rows: string; source: string; result: string }> = {
  zh: { title: '归一化接入', rows: '数值与占比', source: '原始数据', result: '归一化结果' },
  en: { title: 'Normalize input', rows: 'Values and shares', source: 'Source data', result: 'Normalized result' },
};
