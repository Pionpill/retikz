import type { Lang } from '@/i18n';

export const coordinateResolutionFlowI18n: Record<Lang, Array<string>> = {
  zh: ['读取 position', '查询已有引用', '登记零尺寸点', '供后续引用'],
  en: ['Read position', 'Look up known IDs', 'Register zero-size point', 'Reference later'],
};
