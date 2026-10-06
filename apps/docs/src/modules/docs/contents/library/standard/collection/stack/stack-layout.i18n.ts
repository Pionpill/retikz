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
    top: string;
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
    top: '栈顶标签',
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
    top: 'Top label',
  },
};
