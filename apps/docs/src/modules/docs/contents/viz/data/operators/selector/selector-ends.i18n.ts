import type { Lang } from '@/i18n';

import { operatorDemoI18n } from '../operator-demo.i18n';

/** 首行与末行演示及控制面板文案 */
export const selectorEndsI18n = {
  zh: { ...operatorDemoI18n.zh, title: '首行与末行' },
  en: { ...operatorDemoI18n.en, title: 'First and last rows' },
} satisfies Record<Lang, Record<string, string>>;
