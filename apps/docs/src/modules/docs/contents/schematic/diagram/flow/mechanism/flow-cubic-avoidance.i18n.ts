import type { Lang } from '@/i18n';

/** 三次候选几何图文案 */
export const flowCubicAvoidanceI18n = {
  zh: {
    titles: ['① 固定 Q 和 τ，沿首尾方向反求 C₁、C₂', '② 同一个 Q，不同方向产生不同曲线'],
    notes: ['灰色虚线是控制折线，蓝色曲线经过 Q，不经过控制点', '蓝 / 橙：下侧两种候选；红：上侧候选撞到 C'],
    source: '起点',
    target: '终点',
    controls: ['C₁', 'C₂'],
    through: 'Q (τ = 1/2)',
    nodes: ['A', 'B', 'C'],
  },
  en: {
    titles: [
      '1. Fix Q and τ; solve C₁/C₂ along endpoint directions',
      '2. Same Q, different directions and curve shapes',
    ],
    notes: [
      'Dotted control polygon; the blue curve passes through Q',
      'Blue/orange: lower candidates; red: upper route hits C',
    ],
    source: 'Start',
    target: 'End',
    controls: ['C₁', 'C₂'],
    through: 'Q (τ = 1/2)',
    nodes: ['A', 'B', 'C'],
  },
} satisfies Record<
  Lang,
  {
    titles: Array<string>;
    notes: Array<string>;
    source: string;
    target: string;
    controls: Array<string>;
    through: string;
    nodes: Array<string>;
  }
>;
