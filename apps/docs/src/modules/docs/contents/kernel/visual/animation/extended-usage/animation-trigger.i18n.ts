import type { Lang } from '@/i18n';

/** 触发器示例的图形、操作和控制面板文案 */
export const animationTriggerI18n: Record<
  Lang,
  {
    title: string;
    section: string;
    trigger: string;
    load: string;
    visible: string;
    manual: string;
    click: string;
    node: string;
    start: string;
    reset: string;
    hints: Record<string, string>;
  }
> = {
  zh: {
    title: '动画触发',
    section: '触发条件',
    trigger: '触发方式',
    load: '加载时',
    visible: '进入可见区域',
    manual: '手动启动',
    click: '点击图元',
    node: '目标',
    start: '启动动画',
    reset: '重新加载',
    hints: {
      load: '加载后自动缩放；重新加载可再次观察。',
      visible: '向下滚动此区域，让图元进入视口后触发。',
      manual: '点击“启动动画”，通过播放句柄启动。',
      click: '点击下方图元，触发一次缩放动画。',
    },
  },
  en: {
    title: 'Triggers',
    section: 'Activation',
    trigger: 'Trigger',
    load: 'On load',
    visible: 'When visible',
    manual: 'Manual',
    click: 'Click element',
    node: 'Target',
    start: 'Start animation',
    reset: 'Reload',
    hints: {
      load: 'Scales automatically on load. Reload to observe again.',
      visible: 'Scroll down inside this area to bring the element into view.',
      manual: 'Click “Start animation” to activate the playback handle.',
      click: 'Click the element below to trigger one scale animation.',
    },
  },
};
