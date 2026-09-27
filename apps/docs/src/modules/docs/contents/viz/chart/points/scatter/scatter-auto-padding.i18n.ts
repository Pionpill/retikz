import type { Lang } from '@/i18n';

/** 自动留白策略对比文案 */
export const scatterAutoPaddingI18n: Record<
  Lang,
  { maximum: string; aware: string; clearance: string; directional: string }
> = {
  zh: {
    maximum: '最大半径 · 默认',
    aware: '逐点紧凑 · 可选',
    clearance: '外缘净空',
    directional: '净空：默认 8，上 20，左 0',
  },
  en: {
    maximum: 'Maximum radius · default',
    aware: 'Point-aware · opt-in',
    clearance: 'Edge clearance',
    directional: 'Clearance: default 8, top 20, left 0',
  },
};
