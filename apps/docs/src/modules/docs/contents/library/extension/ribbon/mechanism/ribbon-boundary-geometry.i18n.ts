import type { Lang } from '@/i18n';

/** 已有边界闭合示意图文案 */
export const ribbonBoundaryGeometryI18n: Record<Lang, { stages: Array<string>; notes: Array<string> }> = {
  zh: {
    stages: ['1. 两条同向边界', '2. 反转下边界', '3. 两端直线封口'],
    notes: ['upper / lower：起点 → 终点', 'lower：终点 → 起点', '曲线形状和控制柄不变'],
  },
  en: {
    stages: ['1. Two forward sides', '2. Reverse lower side', '3. Close with lines'],
    notes: ['upper / lower: start → end', 'lower: end → start', 'Curve geometry is preserved'],
  },
};
