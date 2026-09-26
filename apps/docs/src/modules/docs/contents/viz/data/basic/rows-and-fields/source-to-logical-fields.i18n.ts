import type { Lang } from '@/i18n';

/** 数据源与逻辑字段对照图的双语文案 */
export const sourceToLogicalFieldsI18n: Record<
  Lang,
  {
    sales: string;
    forecast: string;
    normalized: string;
  }
> = {
  zh: {
    sales: '销售源 · 字段摘录',
    forecast: '预测源 · 路径摘录',
    normalized: '规范化行 · 两种来源的结果',
  },
  en: {
    sales: 'Sales source · field excerpts',
    forecast: 'Forecast source · path excerpts',
    normalized: 'Normalized row · either source',
  },
};
