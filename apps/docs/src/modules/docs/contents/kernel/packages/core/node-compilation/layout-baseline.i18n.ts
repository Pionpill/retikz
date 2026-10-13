import type { Lang } from '@/i18n';

/** 基线度量图的文案 */
export const layoutBaselineI18n: Record<
  Lang,
  { slot: string; glyph: string; baseline: string; top: string; bottom: string }
> = {
  zh: { slot: '行槽 · 24', glyph: '字形度量盒', baseline: '基线 · 距顶部 17', top: '上留白 · 3', bottom: '下留白 · 3' },
  en: {
    slot: 'Line slot · 24',
    glyph: 'Glyph metric box',
    baseline: 'Baseline · 17 from top',
    top: 'Top space · 3',
    bottom: 'Bottom space · 3',
  },
};
