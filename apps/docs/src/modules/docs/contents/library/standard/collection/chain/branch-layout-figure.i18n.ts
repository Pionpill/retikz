import type { Lang } from '@/i18n';

/** 分支布局对照图文案 */
export const branchLayoutFigureI18n: Record<Lang, { independent: string; steps: string }> = {
  zh: { independent: 'independent：E 按支路总宽居中', steps: 'steps：E 占第二条步骤轨道' },
  en: { independent: 'independent: E centered in branch width', steps: 'steps: E occupies the second step track' },
};
