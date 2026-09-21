import type { Lang } from '@/i18n';

/** 七种效果的对照标签 */
export const animationPresetsI18n: Record<Lang, Array<string>> = {
  zh: [
    '放大 · grow',
    '向上生长 · growUp',
    '脉冲 · pulse',
    '旋转 · spin',
    '闪动 · flash',
    '闪烁 · blink',
    '摆动 · wiggle',
  ],
  en: ['grow', 'growUp', 'pulse', 'spin', 'flash', 'blink', 'wiggle'],
};
