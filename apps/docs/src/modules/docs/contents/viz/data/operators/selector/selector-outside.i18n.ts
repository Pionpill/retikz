import type { Lang } from '@/i18n';

import { operatorDemoI18n } from '../operator-demo.i18n';

/** 分位区间外的行演示及控制面板文案 */
export const selectorOutsideI18n = {
  zh: { ...operatorDemoI18n.zh, title: '分位区间外的行' },
  en: { ...operatorDemoI18n.en, title: 'Rows outside a quantile band' },
} satisfies Record<Lang, Record<string, string>>;
