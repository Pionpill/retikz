import type { Lang } from '@/i18n';

export const layoutViewboxResolutionI18n = {
  zh: {
    select: '已确定的视窗',
    priority: '200 × 100',
    range: '计算宽高比',
    automatic: '200 / 100 = 2',
    size: '仅指定数值宽度',
    sizing: 'width = 400',
    display: '补齐显示高度',
    independent: '400 / 2 = 200',
  },
  en: {
    select: 'Resolved viewport',
    priority: '200 × 100',
    range: 'Compute ratio',
    automatic: '200 / 100 = 2',
    size: 'Numeric width only',
    sizing: 'width = 400',
    display: 'Derive display height',
    independent: '400 / 2 = 200',
  },
} satisfies Record<Lang, Record<string, string>>;
