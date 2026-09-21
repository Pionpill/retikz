import type { Lang } from '@/i18n';
/** 轨道在固定时刻的状态文案 */
export const animationSamplesI18n: Record<Lang, { states: Array<string>; operation: string }> = {
  zh: {
    states: ['未开始：基础值 1', '起点：opacity 0.2', '中点：opacity 0.6', '结束：opacity 1'],
    operation: 'linear：经过 500ms',
  },
  en: {
    states: ['Before: base value 1', 'Start: opacity 0.2', 'Middle: opacity 0.6', 'End: opacity 1'],
    operation: 'linear: after 500ms',
  },
};
