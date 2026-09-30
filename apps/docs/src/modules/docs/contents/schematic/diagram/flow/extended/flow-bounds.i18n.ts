import type { Lang } from '@/i18n';

export const flowBoundsI18n: Record<
  Lang,
  { svg: string; canvas: string; controlsTitle: string; controlsSection: string; excludeFormats: string }
> = {
  zh: {
    svg: 'SVG 输出',
    canvas: 'Canvas 输出',
    controlsTitle: '附属内容与边界',
    controlsSection: '父级占位',
    excludeFormats: '排除格式子布局',
  },
  en: {
    svg: 'SVG output',
    canvas: 'Canvas output',
    controlsTitle: 'Attached content and bounds',
    controlsSection: 'Parent footprint',
    excludeFormats: 'Exclude the formats layout',
  },
};
