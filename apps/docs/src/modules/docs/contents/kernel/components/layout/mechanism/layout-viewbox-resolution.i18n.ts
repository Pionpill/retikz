import type { Lang } from '@/i18n';

export const layoutViewboxResolutionI18n = {
  zh: {
    select: '选择有效 viewBox',
    priority: 'prop → IR → 自动',
    range: '内部坐标范围',
    automatic: '自动：内容边界 + padding',
    size: '显示尺寸策略',
    sizing: '默认随内容；显式尺寸缩放',
    display: '页面显示尺寸',
    independent: '不改变内部坐标',
  },
  en: {
    select: 'First defined viewBox',
    priority: 'prop → IR → auto',
    range: 'Coordinate range',
    automatic: 'Auto: bounds + padding',
    size: 'Display sizing',
    sizing: 'Content by default; explicit scaling',
    display: 'Display size',
    independent: 'Coordinates stay unchanged',
  },
} satisfies Record<Lang, Record<string, string>>;
