import type { Lang } from '@/i18n';

/** bounds-playground 的本地化文案 */
export type BoundsPlaygroundI18n = Readonly<{
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

/** 按文档语言获取 bounds-playground 文案 */
export const boundsPlaygroundI18n: Record<Lang, BoundsPlaygroundI18n> = {
  zh: {
    label1: '边界计算',
    label2: '点 A',
    label3: 'x 坐标',
    label4: 'y 坐标',
    label5: '点 B',
    label6: 'x 坐标',
    label7: 'y 坐标',
    label8: '点 C',
    label9: 'x 坐标',
    label10: 'y 坐标',
    label11: '圆弧',
    label12: '起始角度',
    label13: '终止角度',
    label14: '三角形点集',
    label15: '横向展开',
    label16: '纵向展开',
  },
  en: {
    label1: 'Bounds calculations',
    label2: 'Point A',
    label3: 'x coordinate',
    label4: 'y coordinate',
    label5: 'Point B',
    label6: 'x coordinate',
    label7: 'y coordinate',
    label8: 'Point C',
    label9: 'x coordinate',
    label10: 'y coordinate',
    label11: 'Arc',
    label12: 'start angle',
    label13: 'end angle',
    label14: 'Triangle points',
    label15: 'Wide spread',
    label16: 'Tall spread',
  },
};
