import type { Lang } from '@/i18n';

/** 图示双语文案 */
export const measurementFigureI18n: Record<
  Lang,
  { natural: string; needed: string; fixed: string; padding: string; override: string }
> = {
  zh: {
    natural: '内容自然尺寸',
    needed: '单格需求：四边 padding = 8',
    fixed: '显式宽度覆盖需求',
    padding: '加内边距',
    override: 'width = 60',
  },
  en: {
    natural: 'Natural content size',
    needed: 'Cell need: padding = 8',
    fixed: 'Explicit width overrides need',
    padding: 'Add padding',
    override: 'width = 60',
  },
};
