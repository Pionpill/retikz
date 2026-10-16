import type { Lang } from '@/i18n';

/** 自动留白试验场文案 */
export const pointAutoPaddingI18n = {
  zh: {
    title: '边缘留白',
    data: '数据',
    rows: '节点数据',
    strategy: '策略',
    maximum: '最大半径',
    aware: '逐点求解',
    off: '关闭',
    clearance: '外缘净空',
    override: '尺度覆盖',
    automatic: '自动',
    zero: '两端为零',
    lower: '起点为零',
  },
  en: {
    title: 'Edge padding',
    data: 'Data',
    rows: 'Node data',
    strategy: 'Strategy',
    maximum: 'Maximum radius',
    aware: 'Point-aware',
    off: 'Off',
    clearance: 'Edge clearance',
    override: 'Scale override',
    automatic: 'Automatic',
    zero: 'Both ends zero',
    lower: 'Start zero',
  },
} satisfies Record<Lang, Record<string, string>>;
