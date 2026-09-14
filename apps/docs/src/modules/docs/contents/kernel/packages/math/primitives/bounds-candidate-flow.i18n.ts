import type { Lang } from '@/i18n';

/** bounds-candidate-flow 的本地化文案 */
export type BoundsCandidateFlowI18n = Readonly<{
  label1: string;
  label2: string;
  label3: string;
  label4: string;
  label5: string;
  label6: string;
  label7: string;
  label8: string;
  label9: string;
}>;

/** 按文档语言获取 bounds-candidate-flow 文案 */
export const boundsCandidateFlowI18n: Record<Lang, BoundsCandidateFlowI18n> = {
  zh: {
    label1: '几何输入',
    label2: '常规点',
    label3: '曲线',
    label4: '基本图形',
    label5: '直接纳入',
    label6: '端点与轴向极值',
    label7: '派生边界候选点',
    label8: '候选点集',
    label9: '计算边界',
  },
  en: {
    label1: 'Geometry input',
    label2: 'Point',
    label3: 'Curve',
    label4: 'Basic shape',
    label5: 'Use directly',
    label6: 'Endpoints and axis extrema',
    label7: 'Derive boundary candidates',
    label8: 'Candidate points',
    label9: 'Compute bounds',
  },
};
