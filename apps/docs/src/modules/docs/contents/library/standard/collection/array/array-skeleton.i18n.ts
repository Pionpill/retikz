import type { Lang } from '@/i18n';

/** 骨架示例的面板文案 */
export const arraySkeletonI18n = {
  zh: {
    title: '示意骨架',
    mode: '格内内容',
    empty: '空格',
    symbols: '符号文字',
    count: '格子数量',
    labels: '格内文字（用 | 分隔）',
    index: '格外标号',
    none: '隐藏',
    auto: '自动编号',
    custom: '自定义标号',
  },
  en: {
    title: 'Schematic skeleton',
    mode: 'Cell contents',
    empty: 'Empty cells',
    symbols: 'Symbolic text',
    count: 'Cell count',
    labels: 'Inside labels (separate with |)',
    index: 'Outside indices',
    none: 'Hidden',
    auto: 'Automatic',
    custom: 'Custom labels',
  },
} satisfies Record<Lang, Record<string, string>>;
