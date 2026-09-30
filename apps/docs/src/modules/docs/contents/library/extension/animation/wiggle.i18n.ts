import type { Lang } from '@/i18n';

/** 动画试验场的双语文案 */
export const demoI18n = {
  zh: { title: '摆动强调', section: '动画参数', effect: '效果', duration: '单次时长', extra: '摆动角度' },
  en: {
    title: 'Wiggle emphasis',
    section: 'Animation options',
    effect: 'Effect',
    duration: 'Duration',
    extra: 'Wiggle angle',
  },
} satisfies Record<Lang, Record<string, string>>;
