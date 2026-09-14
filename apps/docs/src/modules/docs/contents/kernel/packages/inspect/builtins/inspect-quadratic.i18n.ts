import type { Lang } from '@/i18n';

/** Shared drawing and controls text. */
export const inspectQuadraticI18n: Record<
  Lang,
  {
    title: string;
    shape: string;
    inspect: string;
    position: string;
    start: string;
    control: string;
    end: string;
    controlPoints: string;
    vertices: string;
    labels: string;
  }
> = {
  zh: {
    title: '二次贝塞尔',
    shape: '图形参数',
    inspect: '检查选项',
    position: '位置',
    start: '起点',
    control: '控制点',
    end: '终点',
    controlPoints: '控制柄',
    vertices: '顶点',
    labels: '标签',
  },
  en: {
    title: 'Quadratic Bézier',
    shape: 'Shape parameters',
    inspect: 'Inspection options',
    position: 'Position',
    start: 'Start',
    control: 'Control point',
    end: 'End',
    controlPoints: 'Control handles',
    vertices: 'Vertices',
    labels: 'Labels',
  },
};
