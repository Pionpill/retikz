import type { Lang } from '@/i18n';

/** 图内标注与控制面板的同源双语文案 */
export const transformDemoI18n = {
  zh: {
    empty: '没有输出记录',
    extended: '采样范围扩展至 0～4',
    global: '不分组',
    grouped: '按 team 分组',
    linear: '线性',
    method: '拟合方法',
    quadratic: '二次',
    result: '变换结果',
    samples: '每组采样数',
    source: '原始记录',
    trend_smooth: '趋势采样',
  },
  en: {
    empty: 'No output rows',
    extended: 'Extend sampling to 0–4',
    global: 'No grouping',
    grouped: 'Group by team',
    linear: 'Linear',
    method: 'Fit method',
    quadratic: 'Quadratic',
    result: 'Transformed rows',
    samples: 'Samples per group',
    source: 'Original rows',
    trend_smooth: 'Trend sampling',
  },
} satisfies Record<Lang, Record<string, string>>;
