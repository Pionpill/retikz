import type { Lang } from '@/i18n';

/** Entity 外观逐字段合并示意图的双语文案 */
export const entityAppearanceMergeI18n: Record<Lang, Record<string, string>> = {
  zh: {
    authorStage: '1 · 作者 Graph 投影（实例未设置 style）',
    statusRule: 'degraded 规则',
    criticalRule: 'critical 规则',
    projectedSource: '投影后的 Source.style',
    themeStage: '2 · 当前主题与投影 Source 合并',
    themeDefaults: '主题默认值（摘录）',
    sourceOverride: '投影 Source.style',
    finalAppearance: '最终外观（摘录）',
    foreground: '前景色',
  },
  en: {
    authorStage: '1 · Project author Graph layers (no instance style)',
    statusRule: 'degraded rule',
    criticalRule: 'critical rule',
    projectedSource: 'Projected Source.style',
    themeStage: '2 · Merge theme with projected Source',
    themeDefaults: 'Theme defaults (excerpt)',
    sourceOverride: 'Projected Source.style',
    finalAppearance: 'Final appearance (excerpt)',
    foreground: 'foreground',
  },
};
