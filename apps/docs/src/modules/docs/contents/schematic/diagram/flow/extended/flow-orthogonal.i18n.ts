/** 正交避让图与控件文案 */
export const flowOrthogonalI18n = {
  zh: {
    obstacleX: '障碍 X',
    obstacleY: '障碍 Y',
    title: '正交自动避让',
    position: '折点位置',

    source: '起点',
    obstacle: '障碍',
    target: '终点',
    positions: [
      { value: 'auto', label: '自动避让' },
      { value: '0.25', label: '四分之一' },
      { value: '0.5', label: '中点' },
      { value: '0.75', label: '四分之三' },
    ],
  },
  en: {
    obstacleX: 'Obstacle X',
    obstacleY: 'Obstacle Y',
    title: 'Orthogonal avoidance',
    position: 'Turn position',

    source: 'Source',
    obstacle: 'Obstacle',
    target: 'Target',
    positions: [
      { value: 'auto', label: 'Automatic avoidance' },
      { value: '0.25', label: 'Quarter' },
      { value: '0.5', label: 'Midpoint' },
      { value: '0.75', label: 'Three-quarter' },
    ],
  },
} as const;
