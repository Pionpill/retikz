import type { Lang } from '@/i18n';

/** 自动选择流程的双语文案 */
export const regressionAutoFlowI18n = {
  zh: {
    defaults: '输入：auto 默认候选',
    custom: '输入：指定 candidates',
    customDetail: '仅使用数组中的方法与参数',
    score: '计算：比较 R²',
    scoreDetail: '同组观测拟合，选择最高值',
    render: '渲染：最佳模型',
    renderDetail: '复用模型采样，绘制一条趋势',
  },
  en: {
    defaults: 'Input: auto defaults',
    custom: 'Input: explicit candidates',
    customDetail: 'Use only the supplied methods',
    score: 'Compute: compare R²',
    scoreDetail: 'Fit the same group; select the highest',
    render: 'Render: best model',
    renderDetail: 'Reuse, sample and draw one trend',
  },
} satisfies Record<Lang, Record<string, string>>;
