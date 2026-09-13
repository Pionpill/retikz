import type { Lang } from '@/i18n';

/** Shared drawing and controls text. */
export const inspectEllipseArcI18n: Record<
  Lang,
  {
    title: string;
    shape: string;
    inspect: string;
    position: string;
    radiusX: string;
    radiusY: string;
    startAngle: string;
    endAngle: string;
    arcGeometry: string;
    ellipseAxes: string;
    vertices: string;
    labels: string;
  }
> = {
  zh: {
    title: '椭圆弧',
    shape: '图形参数',
    inspect: '检查选项',
    position: '圆心位置',
    radiusX: '水平半径',
    radiusY: '垂直半径',
    startAngle: '起始角',
    endAngle: '结束角',
    arcGeometry: '圆弧几何',
    ellipseAxes: '十字轴线',
    vertices: '顶点',
    labels: '标签',
  },
  en: {
    title: 'Elliptical arc',
    shape: 'Shape parameters',
    inspect: 'Inspection options',
    position: 'Center',
    radiusX: 'Horizontal radius',
    radiusY: 'Vertical radius',
    startAngle: 'Start angle',
    endAngle: 'End angle',
    arcGeometry: 'Arc geometry',
    ellipseAxes: 'Ellipse axes',
    vertices: 'Vertices',
    labels: 'Labels',
  },
};
