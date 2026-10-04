/** 样条经过点与逐段检测示意文案 */
export const flowSmoothKnotsI18n = {
  zh: {
    title: '有序经过点 → 三次曲段 → 逐段检查',
    a: '障碍 A',
    b: '障碍 B',
    source: 'S 起点',
    target: 'T 终点',
    p1: 'P₁',
    p2: 'P₂',
    p3: 'P₃',
    chain: '灰虚线：点链参照；蓝线：实际样条',
    check: '每个三次曲段最多二分 8 层；冲突只警告，不改点',
  },
  en: {
    title: 'Ordered knots → cubic segments → collision checks',
    a: 'Obstacle A',
    b: 'Obstacle B',
    source: 'S Source',
    target: 'T Target',
    p1: 'P₁',
    p2: 'P₂',
    p3: 'P₃',
    chain: 'Dotted: knot chain; blue: interpolated curve',
    check: 'Up to 8 subdivision levels per segment; warn, keep the knots',
  },
};
