import type { Lang } from '@/i18n';

/** curve-segments 的本地化文案 */
export type CurveSegmentsI18n = Readonly<{
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
  label17: string;
}>;

/** 按文档语言获取 curve-segments 文案 */
export const curveSegmentsI18n: Record<Lang, CurveSegmentsI18n> = {
  zh: {
    label1: '曲线段采样与切片',
    label2: '曲线',
    label3: '类型',
    label4: '直线',
    label5: '二次贝塞尔',
    label6: '三次贝塞尔',
    label7: '圆弧',
    label8: '椭圆弧',
    label9: '参数区间',
    label10: '采样位置',
    label11: '切片起点',
    label12: '切片终点',
    label13: '直线',
    label14: '二次贝塞尔',
    label15: '三次贝塞尔',
    label16: '圆弧',
    label17: '椭圆弧',
  },
  en: {
    label1: 'Curve sampling and slicing',
    label2: 'Curve',
    label3: 'type',
    label4: 'Line',
    label5: 'Quadratic Bézier',
    label6: 'Cubic Bézier',
    label7: 'Circular arc',
    label8: 'Elliptical arc',
    label9: 'Parameter interval',
    label10: 'sample position',
    label11: 'slice start',
    label12: 'slice end',
    label13: 'Line',
    label14: 'Quadratic Bézier',
    label15: 'Cubic Bézier',
    label16: 'Circular arc',
    label17: 'Elliptical arc',
  },
};
