import type { Lang } from '@/i18n';

/** curve-distance-search-flow 的本地化文案 */
export type CurveDistanceSearchFlowI18n = Readonly<{
  label1: string;
  label2: string;
  label3: string;
  label4: string;
  label5: string;
  label6: string;
}>;

/** 按文档语言获取 curve-distance-search-flow 文案 */
export const curveDistanceSearchFlowI18n: Record<Lang, CurveDistanceSearchFlowI18n> = {
  zh: {
    label1: '目标 d\n区间 [lo, hi]',
    label2: '取中点 t',
    label3: '估算 L(t)',
    label4: 'L(t) 接近 d？',
    label5: '参数 t',
    label6: '是',
  },
  en: {
    label1: 'Target d\nRange [lo, hi]',
    label2: 'Midpoint t',
    label3: 'Measure L(t)',
    label4: 'L(t) ≈ d?',
    label5: 'Parameter t',
    label6: 'yes',
  },
};
