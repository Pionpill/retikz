import type { Lang } from '@/i18n';

/** circle-constructions 的本地化文案 */
export type CircleConstructionsI18n = Readonly<{
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
  label12: string;
  label13: string;
  label14: string;
  label15: string;
  label16: string;
}>;

/** 按文档语言获取 circle-constructions 文案 */
export const circleConstructionsI18n: Record<Lang, CircleConstructionsI18n> = {
  zh: {
    label1: '圆与三角形',
    label2: '方案',
    label3: '构造方式',
    label4: '三角形外接圆',
    label5: '三角形内切圆',
    label6: '点集最小包围圆',
    label7: '三角形控制点',
    label8: '点 A',
    label9: '点 B',
    label10: '点 C',
    label11: '点集控制点',
    label12: '点 1',
    label13: '点 2',
    label14: '点 3',
    label15: '点 4',
    label16: '点 5',
  },
  en: {
    label1: 'Circles and triangles',
    label2: 'Scheme',
    label3: 'Construction',
    label4: 'Triangle circumcircle',
    label5: 'Triangle incircle',
    label6: 'Minimal enclosing circle',
    label7: 'Triangle points',
    label8: 'Point A',
    label9: 'Point B',
    label10: 'Point C',
    label11: 'Point-set points',
    label12: 'Point 1',
    label13: 'Point 2',
    label14: 'Point 3',
    label15: 'Point 4',
    label16: 'Point 5',
  },
};
