import type { Lang } from '@/i18n';

/** 曲线投影示例文案 */
export const curveProjectionI18n: Record<
  Lang,
  {
    title: string;
    kind: string;
    line: string;
    quadratic: string;
    cubic: string;
    arc: string;
    ellipse: string;
    controlX: string;
    controlY: string;
    angle: string;
    axis: string;
  }
> = {
  zh: {
    title: '曲线投影',
    kind: '曲线段类型',
    line: '直线',
    quadratic: '二次贝塞尔',
    cubic: '三次贝塞尔',
    arc: '圆弧',
    ellipse: '椭圆弧',
    controlX: '控制点 X',
    controlY: '控制点 Y',
    angle: '投影角度',
    axis: '投影方向',
  },
  en: {
    title: 'Curve projection',
    kind: 'Segment type',
    line: 'Line',
    quadratic: 'Quadratic Bézier',
    cubic: 'Cubic Bézier',
    arc: 'Circular arc',
    ellipse: 'Elliptical arc',
    controlX: 'Control X',
    controlY: 'Control Y',
    angle: 'Projection angle',
    axis: 'Projection axis',
  },
};
