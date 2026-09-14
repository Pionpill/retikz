import type { Lang } from '@/i18n';

/** Shared drawing and controls text. */
export const inspectArcI18n: Record<
  Lang,
  {
    title: string;
    shape: string;
    inspect: string;
    position: string;
    radius: string;
    startAngle: string;
    endAngle: string;
    arcGeometry: string;
    vertices: string;
    labels: string;
  }
> = {
  zh: {
    title: '圆弧',
    shape: '图形参数',
    inspect: '检查选项',
    position: '圆心位置',
    radius: '半径',
    startAngle: '起始角',
    endAngle: '结束角',
    arcGeometry: '圆弧几何',
    vertices: '顶点',
    labels: '标签',
  },
  en: {
    title: 'Circular arc',
    shape: 'Shape parameters',
    inspect: 'Inspection options',
    position: 'Center',
    radius: 'Radius',
    startAngle: 'Start angle',
    endAngle: 'End angle',
    arcGeometry: 'Arc geometry',
    vertices: 'Vertices',
    labels: 'Labels',
  },
};
