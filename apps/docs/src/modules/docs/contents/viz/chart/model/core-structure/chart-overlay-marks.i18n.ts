import type { Lang } from '@/i18n';

/** 默认图元与叠加图元关系的示意图文案 */
export const chartOverlayMarksI18n: Record<
  Lang,
  Readonly<{ source: string; builtIn: string; overlay: string; result: string; defaultMark: string; addedMark: string }>
> = {
  zh: {
    source: 'Chart Source · 概念示意',
    builtIn: '默认 Scatter',
    overlay: '叠加 Line',
    result: '最终 Plot 图元',
    defaultMark: 'Scatter 点',
    addedMark: 'Line 折线',
  },
  en: {
    source: 'Chart Source · concept',
    builtIn: 'Default Scatter',
    overlay: 'Overlay Line',
    result: 'Final Plot marks',
    defaultMark: 'Scatter points',
    addedMark: 'Line path',
  },
};
