/** 控制点示意图文案 */
export const flowBezierControlsI18n = {
  zh: {
    source: '起点 P₀',
    target: '终点 P₁',
    obstacle: '节点障碍',
    control: '控制点 C',
    through: '经过点 Q（τ = 1/2）',
    note: 'C = 2Q − (P₀ + P₁)/2',
    legend: '蓝线经过 Q；灰色控制折线只决定弯曲，不是路径',
  },
  en: {
    source: 'Start P₀',
    target: 'End P₁',
    obstacle: 'Obstacle',
    control: 'Control C',
    through: 'Waypoint Q (τ = 1/2)',
    note: 'C = 2Q − (P₀ + P₁)/2',
    legend: 'The blue curve passes Q; the gray control polygon is not the route',
  },
};
