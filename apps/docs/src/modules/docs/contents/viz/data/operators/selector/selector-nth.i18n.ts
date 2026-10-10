import type { Lang } from '@/i18n';

import { operatorDemoI18n } from '../operator-demo.i18n';

/** 指定位置演示及控制面板文案 */
export const selectorNthI18n = {
  zh: { ...operatorDemoI18n.zh, title: '指定位置' },
  en: { ...operatorDemoI18n.en, title: 'Nth row' },
} satisfies Record<Lang, Record<string, string>>;
