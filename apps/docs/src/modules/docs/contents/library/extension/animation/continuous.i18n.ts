import type { Lang } from '@/i18n';

/** 动画试验场的双语文案 */
export const demoI18n = {
  zh: {
    title: '持续强调',
    section: '动画参数',
    effect: '效果',
    duration: '单次时长',
    extra: '脉冲峰值',
    first: '脉冲',
    second: '旋转',
  },
  en: {
    title: 'Continuous emphasis',
    section: 'Animation options',
    effect: 'Effect',
    duration: 'Duration',
    extra: 'Pulse peak',
    first: 'Pulse',
    second: 'Spin',
  },
} satisfies Record<Lang, Record<string, string>>;
