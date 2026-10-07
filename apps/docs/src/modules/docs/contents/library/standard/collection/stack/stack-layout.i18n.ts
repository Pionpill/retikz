import type { Lang } from '@/i18n';

/** 图形与控件文案 */
export const stackI18n: Record<
  Lang,
  {
    title: string;
    direction: string;
    up: string;
    down: string;
    left: string;
    right: string;
    border: string;
    padding: string;
    input: string;
    output: string;
    styled: string;
    reverseArrows: string;
  }
> = {
  zh: {
    title: '调整堆叠与边框',
    direction: '栈底到栈顶',
    up: '向上',
    down: '向下',
    left: '向左',
    right: '向右',
    border: '开放边框',
    padding: '容器留白',
    input: '进入箭头',
    output: '出去箭头',
    styled: '自定义样式',
    reverseArrows: '交换箭头位置',
  },
  en: {
    title: 'Arrange cells and border',
    direction: 'Bottom to top',
    up: 'Up',
    down: 'Down',
    left: 'Left',
    right: 'Right',
    border: 'Open border',
    padding: 'Container padding',
    input: 'Incoming arrow',
    output: 'Outgoing arrow',
    styled: 'Custom style',
    reverseArrows: 'Swap arrow positions',
  },
};
