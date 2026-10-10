import type { Lang } from '@/i18n';

import { operatorDemoI18n } from '../operator-demo.i18n';

/** 最高与最低 N 行演示及控制面板文案 */
export const selectorRankedI18n = {
  zh: { ...operatorDemoI18n.zh, title: '最高与最低 N 行' },
  en: { ...operatorDemoI18n.en, title: 'Highest and lowest N rows' },
} satisfies Record<Lang, Record<string, string>>;
