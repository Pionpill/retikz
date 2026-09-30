import type { Lang } from '@/i18n';

/** 动画试验场的双语文案 */
export const demoI18n = {
  zh: {
    title: '生长入场',
    section: '动画参数',
    effect: '效果',
    duration: '单次时长',
    extra: '支点',
    first: '整体放大',
    second: '向上长出',
    opt0: '中心',
    opt1: '底边',
  },
  en: {
    title: 'Growth entrance',
    section: 'Animation options',
    effect: 'Effect',
    duration: 'Duration',
    extra: 'Origin',
    first: 'Grow',
    second: 'Grow up',
    opt0: 'Center',
    opt1: 'Bottom',
  },
} satisfies Record<Lang, Record<string, string>>;
