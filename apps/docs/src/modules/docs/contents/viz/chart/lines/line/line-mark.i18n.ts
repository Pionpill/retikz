import type { Lang } from '@/i18n';

/** 示例控件文案 */
export const lineMarkI18n = {
  zh: { data: '数据', settings: '折线配置', override: '替换内建图元', point: '显示追加观测点' },
  en: { data: 'Data', settings: 'Line settings', override: 'Replace built-in marks', point: 'Show authored points' },
} satisfies Record<Lang, Record<string, string>>;
