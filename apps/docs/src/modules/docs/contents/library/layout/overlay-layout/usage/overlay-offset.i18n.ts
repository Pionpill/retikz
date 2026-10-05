import type { Lang } from '@/i18n';

/** 功能面板的双语文案 */
export const demoI18n = {
  zh: {
    title: '放置后偏移',
    x: '水平偏移',
    y: '垂直偏移',
    alignSelf: '第二项垂直覆盖',
    alignSelf0: '起点',
    alignSelf1: '居中',
    alignSelf2: '终点',
    alignSelf3: '拉伸',
  },
  en: {
    title: 'Post-placement offset',
    x: 'Horizontal offset',
    y: 'Vertical offset',
    alignSelf: 'Second item vertical override',
    alignSelf0: 'Start',
    alignSelf1: 'Center',
    alignSelf2: 'End',
    alignSelf3: 'Stretch',
  },
} satisfies Record<Lang, Record<string, string>>;
