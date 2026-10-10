import type { Lang } from '@/i18n';

import { operatorDemoI18n } from '../operator-demo.i18n';

/** 极值行演示及控制面板文案 */
export const selectorExtremaI18n = {
  zh: { ...operatorDemoI18n.zh, title: '极值行' },
  en: { ...operatorDemoI18n.en, title: 'Extreme rows' },
} satisfies Record<Lang, Record<string, string>>;
