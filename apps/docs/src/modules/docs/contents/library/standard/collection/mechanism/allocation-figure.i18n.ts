import type { Lang } from '@/i18n';

/** 图示双语文案 */
export const allocationFigureI18n: Record<
  Lang,
  { auto: string; content: string; map: string; matrix: string; chain: string; fixed: string }
> = {
  zh: {
    auto: 'Array auto：96 × 52 / 96 × 52',
    content: 'Array content：56 × 52 / 96 × 52',
    map: 'Map：两列各 96；两行各 52',
    matrix: 'Matrix：列宽 56 / 96；行高 52',
    chain: 'Chain：56 × 40 / 96 × 52',
    fixed: 'Array 单格固定：60 × 52 / 96 × 52',
  },
  en: {
    auto: 'Array auto: 96 × 52 / 96 × 52',
    content: 'Array content: 56 × 52 / 96 × 52',
    map: 'Map: columns 96; rows 52',
    matrix: 'Matrix: columns 56 / 96; rows 52',
    chain: 'Chain: 56 × 40 / 96 × 52',
    fixed: 'Array fixed cell: 60 × 52 / 96 × 52',
  },
};
