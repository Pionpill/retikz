import type { Lang } from '@/i18n';

/** 同尺度冻结示意图的文案 */
export const figureI18n: Record<Lang, { rows: Array<string>; notes: Array<string>; reference: string }> = {
  zh: {
    rows: ['① 基础尺寸', '② 首轮分配并钳制', '③ 将剩余 21 分给第一项'],
    notes: ['grow = 1 : 3；第二项 max = 100', '67 + 100 + gap 12 = 179', '88 + 100 + gap 12 = 200'],
    reference: '同一容器宽 200；灰色虚线为固定参照',
  },
  en: {
    rows: ['1. Base sizes', '2. Distribute and clamp', '3. Give remaining 21 to item 1'],
    notes: ['grow = 1 : 3; item 2 max = 100', '67 + 100 + gap 12 = 179', '88 + 100 + gap 12 = 200'],
    reference: 'Same width: 200; dotted outline is the fixed reference',
  },
};
