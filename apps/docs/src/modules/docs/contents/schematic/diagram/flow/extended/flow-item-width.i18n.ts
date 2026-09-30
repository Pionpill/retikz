/** Flow itemWidth 示例与面板文案 */
export const flowItemWidthI18n = {
  zh: {
    title: '步骤宽度',
    section: '直接 Entity',
    direction: '排列方向',
    directionOptions: [
      { value: 'down', label: '向下' },
      { value: 'right', label: '向右' },
    ],
    widthMode: '宽度方式',
    natural: '自然宽度',
    matchLargest: '匹配最大宽度',
    fixed: '固定宽度',
    width: '固定宽度值',
    input: '输入',
    output: '写入队列并通知后续处理',
  },
  en: {
    title: 'Step widths',
    section: 'Direct Entities',
    direction: 'Placement direction',
    directionOptions: [
      { value: 'down', label: 'Down' },
      { value: 'right', label: 'Right' },
    ],
    widthMode: 'Width mode',
    natural: 'Natural width',
    matchLargest: 'Match largest',
    fixed: 'Fixed width',
    width: 'Fixed width value',
    input: 'Input',
    output: 'Queue the processed data',
  },
} as const;
