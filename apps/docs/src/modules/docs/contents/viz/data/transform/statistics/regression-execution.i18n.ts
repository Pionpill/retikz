import type { Lang } from '@/i18n';

/** 单组拟合与采样的源码阅读顺序 */
export const regressionExecutionI18n: Record<Lang, Array<string>> = {
  zh: [
    'computeSmooth：分组并提取有限观测',
    'regression.fit → implementation.fit',
    'sampleExtentOf → validateExtent',
    'linearSamplesOf → model.predict',
    'computeSmooth：生成预测行',
  ],
  en: [
    'computeSmooth: group finite observations',
    'regression.fit → implementation.fit',
    'sampleExtentOf → validateExtent',
    'linearSamplesOf → model.predict',
    'computeSmooth: emit prediction rows',
  ],
};
