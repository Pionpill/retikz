import type { Lang } from '@/i18n';

/** 功能面板的双语文案 */
export const demoI18n = {
  zh: {
    title: '单项覆盖',
    margin: '首项外边距',
    justifySelf: '首项水平对齐',
    justifySelf0: '起点',
    justifySelf1: '居中',
    justifySelf2: '终点',
    justifySelf3: '拉伸',
    alignSelf: '首项垂直对齐',
    alignSelf0: '起点',
    alignSelf1: '居中',
    alignSelf2: '终点',
    alignSelf3: '拉伸',
  },
  en: {
    title: 'Item overrides',
    margin: 'First item margin',
    justifySelf: 'First item horizontal alignment',
    justifySelf0: 'Start',
    justifySelf1: 'Center',
    justifySelf2: 'End',
    justifySelf3: 'Stretch',
    alignSelf: 'First item vertical alignment',
    alignSelf0: 'Start',
    alignSelf1: 'Center',
    alignSelf2: 'End',
    alignSelf3: 'Stretch',
  },
} satisfies Record<Lang, Record<string, string>>;
