import type { Lang } from '@/i18n';

/** 中心线轮廓示意图文案 */
export const ribbonCenterlineGeometryI18n: Record<
  Lang,
  { stages: Array<string>; notes: Array<string>; offset: string }
> = {
  zh: {
    stages: ['1. 中心线取样', '2. 法线方向偏移', '3. 过点连接并闭合'],
    notes: ['7 个等弧长采样点', '蓝 / 橙：左右边界点', '两侧曲线 + 两端封口'],
    offset: 'offset = 0.5',
  },
  en: {
    stages: ['1. Sample centerline', '2. Offset along normals', '3. Interpolate and close'],
    notes: ['7 arc-length samples', 'Blue / orange: side points', 'Two curves + end closures'],
    offset: 'offset = 0.5',
  },
};
