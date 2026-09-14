import type { Lang } from '@/i18n';

/** curve-playground 的本地化文案 */
export type CurvePlaygroundI18n = Readonly<{
  label1: string;
  label2: string;
  label3: string;
  label4: string;
  label5: string;
  label6: string;
  label7: string;
  label8: string;
  label9: string;
  label10: string;
  label11: string;
}>;

/** 按文档语言获取 curve-playground 文案 */
export const curvePlaygroundI18n: Record<Lang, CurvePlaygroundI18n> = {
  zh: {
    label1: '过点曲线',
    label2: '输入',
    label3: '点集',
    label4: '不均匀间距',
    label5: '折返',
    label6: '含重合点',
    label7: '控制点',
    label8: '张力',
    label9: '不均匀点距',
    label10: '折返曲线',
    label11: '重合点退化',
  },
  en: {
    label1: 'Curve through points',
    label2: 'Input',
    label3: 'Point set',
    label4: 'Uneven spacing',
    label5: 'Zigzag',
    label6: 'Coincident point',
    label7: 'Control point',
    label8: 'tension',
    label9: 'Uneven spacing',
    label10: 'Zigzag',
    label11: 'Coincident point',
  },
};
