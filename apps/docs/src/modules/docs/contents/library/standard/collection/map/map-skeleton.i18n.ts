import type { Lang } from '@/i18n';

/** 骨架示例的面板文案 */
export const mapSkeletonI18n = {
  zh: { title: '示意骨架', keys: '符号键（用 | 分隔）', empty: '空集合' },
  en: { title: 'Schematic skeleton', keys: 'Symbolic keys (separate with |)', empty: 'Empty collection' },
} satisfies Record<Lang, Record<string, string>>;
