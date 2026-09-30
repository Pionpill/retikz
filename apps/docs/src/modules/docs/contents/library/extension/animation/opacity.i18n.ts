import type { Lang } from '@/i18n';

/** 动画试验场的双语文案 */
export const demoI18n = {
  zh: {
    title: '透明度闪烁',
    section: '动画参数',
    effect: '效果',
    duration: '单次时长',
    extra: '最低透明度',
    first: '有限闪动',
    second: '持续闪烁',
  },
  en: {
    title: 'Opacity flashing',
    section: 'Animation options',
    effect: 'Effect',
    duration: 'Duration',
    extra: 'Minimum opacity',
    first: 'Flash twice',
    second: 'Blink continuously',
  },
} satisfies Record<Lang, Record<string, string>>;
