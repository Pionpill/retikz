import type { Lang } from '@/i18n';
/** 同一组图元的绘制顺序文案 */
export const blendOrderI18n: Record<Lang, { titles: Array<string>; notes: Array<string>; background: string }> = {
  zh: {
    titles: ['先画 A', '再画 B', '交换顺序'],
    notes: ['A: normal', 'A → B: multiply', 'B → A: normal'],
    background: '各面板使用相同白色背景',
  },
  en: {
    titles: ['Draw A first', 'Then draw B', 'Reverse order'],
    notes: ['A: normal', 'A → B: multiply', 'B → A: normal'],
    background: 'Each panel has the same white backdrop',
  },
};
