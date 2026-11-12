import type { Lang } from '@/i18n';

/** 示例控件文案 */
export const lineGapsI18n = {
  zh: {
    settings: '折线配置',
    connectNulls: '连接缺口',
    point: '显示观测点',
  },
  en: {
    settings: 'Line settings',
    connectNulls: 'Connect gaps',
    point: 'Show points',
  },
} satisfies Record<Lang, Record<string, string>>;
