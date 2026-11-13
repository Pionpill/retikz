import type { Lang } from '@/i18n';

/** 示例控件文案 */
export const lineGapsI18n = {
  zh: { data: '数据', settings: '折线配置', connectNulls: '连接缺口', point: '显示观测点' },
  en: { data: 'Data', settings: 'Line settings', connectNulls: 'Connect gaps', point: 'Show points' },
} satisfies Record<Lang, Record<string, string>>;
