import type { Lang } from '@/i18n';

/** 多节点宽度示例的控件文案 */
export const ribbonNonlinearWidthI18n: Record<
  Lang,
  { title: string; start: string; middle: string; end: string; interpolation: string; linear: string; smooth: string }
> = {
  zh: {
    title: '多节点宽度',
    start: '起点宽度',
    middle: '中段宽度',
    end: '终点宽度',
    interpolation: '宽度插值',
    linear: '分段线性',
    smooth: '平滑变化',
  },
  en: {
    title: 'Multi-stop width',
    start: 'Start width',
    middle: 'Middle width',
    end: 'End width',
    interpolation: 'Width interpolation',
    linear: 'Piecewise linear',
    smooth: 'Smooth',
  },
};
