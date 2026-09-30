/** Flow 线性排列示例与面板的双语文案 */
export const flowLinearI18n = {
  zh: {
    title: '固定排列',
    section: '无外壳 Layout',
    directionLabel: '排列方向',
    gapLabel: '元素间距',
    directionOptions: [
      { value: 'right', label: '向右' },
      { value: 'left', label: '向左' },
    ],
    input: '输入',
    validate: '校验',
    output: '输出',
  },
  en: {
    title: 'Fixed placement',
    section: 'Shell-free Layout',
    directionLabel: 'Placement direction',
    gapLabel: 'Element gap',
    directionOptions: [
      { value: 'right', label: 'Right' },
      { value: 'left', label: 'Left' },
    ],
    input: 'Input',
    validate: 'Check',
    output: 'Output',
  },
} as const;
