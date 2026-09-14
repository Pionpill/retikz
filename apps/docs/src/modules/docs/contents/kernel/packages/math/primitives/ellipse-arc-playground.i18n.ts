import type { Lang } from '@/i18n';

/** ellipse-arc-playground 的本地化文案 */
export type EllipseArcPlaygroundI18n = Readonly<{
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

/** 按文档语言获取 ellipse-arc-playground 文案 */
export const ellipseArcPlaygroundI18n: Record<Lang, EllipseArcPlaygroundI18n> = {
  zh: {
    label1: '椭圆与圆弧',
    label2: '椭圆',
    label3: '水平半轴',
    label4: '垂直半轴',
    label5: '圆弧',
    label6: '半径',
    label7: '起始角度',
    label8: '结束角度',
    label9: '标准形状',
    label10: '高椭圆',
    label11: '长圆弧',
  },
  en: {
    label1: 'Ellipse and arc',
    label2: 'Ellipse',
    label3: 'horizontal radius',
    label4: 'vertical radius',
    label5: 'Arc',
    label6: 'radius',
    label7: 'start angle',
    label8: 'end angle',
    label9: 'Balanced shapes',
    label10: 'Tall ellipse',
    label11: 'Long arc',
  },
};
