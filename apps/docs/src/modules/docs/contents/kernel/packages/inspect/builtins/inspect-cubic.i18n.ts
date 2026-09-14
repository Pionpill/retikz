import type { Lang } from '@/i18n';

/** Shared drawing and controls text. */
export const inspectCubicI18n: Record<
  Lang,
  {
    title: string;
    shape: string;
    inspect: string;
    position: string;
    start: string;
    control1: string;
    control2: string;
    end: string;
    controlPoints: string;
    vertices: string;
    labels: string;
  }
> = {
  zh: {
    title: '三次贝塞尔',
    shape: '图形参数',
    inspect: '检查选项',
    position: '位置',
    start: '起点',
    control1: '控制点 1',
    control2: '控制点 2',
    end: '终点',
    controlPoints: '控制柄',
    vertices: '顶点',
    labels: '标签',
  },
  en: {
    title: 'Cubic Bézier',
    shape: 'Shape parameters',
    inspect: 'Inspection options',
    position: 'Position',
    start: 'Start',
    control1: 'Control point 1',
    control2: 'Control point 2',
    end: 'End',
    controlPoints: 'Control handles',
    vertices: 'Vertices',
    labels: 'Labels',
  },
};
