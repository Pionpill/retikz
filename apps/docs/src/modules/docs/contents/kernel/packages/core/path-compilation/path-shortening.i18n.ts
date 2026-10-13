import type { Lang } from '@/i18n';

/** 端点缩短对照图文案 */
export const pathShorteningI18n: Record<
  Lang,
  { titles: Array<string>; notes: Array<string>; control: string; legend: string }
> = {
  zh: {
    titles: ['贝塞尔：保形切片', '圆弧：保留原弧'],
    notes: ['子曲线控制点随切片重算', '箭头连接原弧断点与 B'],
    control: 'C：原曲线控制点',
    legend: '灰：原路径 · 蓝：真实编译结果 · 箭头尖端固定在 B',
  },
  en: {
    titles: ['Bezier: preserve the curve', 'Arc: preserve the arc'],
    notes: ['Slice control points are recalculated', 'Arrow joins the arc cut to B'],
    control: 'C: original control point',
    legend: 'Gray: original · Blue: compiled result · Arrow tip fixed at B',
  },
};
