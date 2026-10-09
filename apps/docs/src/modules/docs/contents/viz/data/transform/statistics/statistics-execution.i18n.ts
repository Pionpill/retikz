import type { Lang } from '@/i18n';

/** 执行阶段标签 */
export const statisticsExecutionI18n: Record<Lang, Array<string>> = {
  zh: [
    'groupRowsByFields',
    'computeReducerMetrics / computation.select',
    'applyReducerOperation / applySelectorOperation',
    'implementation.reduce / implementation.select',
    'computeSummarize / computeSelect 组织结果',
  ],
  en: [
    'groupRowsByFields',
    'computeReducerMetrics / computation.select',
    'applyReducerOperation / applySelectorOperation',
    'implementation.reduce / implementation.select',
    'computeSummarize / computeSelect assemble results',
  ],
};
