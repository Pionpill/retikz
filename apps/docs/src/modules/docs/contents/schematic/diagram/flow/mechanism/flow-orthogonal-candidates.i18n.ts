/** 正交候选示意图文案 */
export const flowOrthogonalCandidatesI18n = {
  zh: {
    source: '起点',
    target: '终点',
    obstacle: '障碍',
    quarter: '0.25 · 选中',
    middle: '0.5 · 碰撞',
    threeQuarter: '0.75 · 无碰撞',
    comparison: '先比较 0.5，再比较 0.25、0.75；三条候选共用固定端点',
    result: '0.25 与 0.75 都无冲突，同分按候选顺序选择 0.25',
  },
  en: {
    source: 'Source',
    target: 'Target',
    obstacle: 'Obstacle',
    quarter: '0.25 · Selected',
    middle: '0.5 · Collision',
    threeQuarter: '0.75 · Clear',
    comparison: 'Try 0.5, then 0.25 and 0.75 with the same fixed endpoints',
    result: '0.25 and 0.75 are clear; candidate order breaks the tie in favor of 0.25',
  },
} as const;
