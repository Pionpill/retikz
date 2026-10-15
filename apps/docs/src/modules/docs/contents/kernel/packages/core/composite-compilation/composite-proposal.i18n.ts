import type { Lang } from '@/i18n';

/** 同一路径在两种尺寸提案下的文案 */
export const compositeProposalI18n: Record<
  Lang,
  { titles: Array<string>; geometry: string; slot: string; note: string }
> = {
  zh: {
    titles: ['自然宽度', '固定槽宽 60'],
    geometry: '子路径的真实几何',
    slot: '分配槽宽',
    note: '同一条子路径 · 同一原点与比例 · 未应用裁剪',
  },
  en: {
    titles: ['Natural width', 'Exact slot width: 60'],
    geometry: 'Child path geometry',
    slot: 'Allocated width',
    note: 'Same child path, origin, and scale · No clipping applied',
  },
};
