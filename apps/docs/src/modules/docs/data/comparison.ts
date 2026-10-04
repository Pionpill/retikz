import type { ValueOf } from '@retikz/foundation';

/** 可选对照对象枚举。 */
export const ComparisonTarget = {
  /** TikZ / PGF 绘图语法。 */
  TikZ: 'tikz',
  /** Vega 可视化语法。 */
  Vega: 'vega',
  /** CSS 布局与样式 */
  CSS: 'css',
  /** React 组件协调与更新 */
  React: 'react',
} as const;

/** 可选对照对象。 */
export type ComparisonTargetValue = ValueOf<typeof ComparisonTarget>;

/** 对照对象展示顺序。 */
export const ComparisonTargetList = [
  ComparisonTarget.TikZ,
  ComparisonTarget.Vega,
  ComparisonTarget.CSS,
  ComparisonTarget.React,
] as const satisfies ReadonlyArray<ComparisonTargetValue>;

/** 对照对象 i18n key。 */
export type ComparisonTargetLabelKey = 'comparison.tikz' | 'comparison.vega' | 'comparison.css' | 'comparison.react';

/** 对照对象到 i18n key 的映射。 */
export const ComparisonTargetLabelKeys: Record<ComparisonTargetValue, ComparisonTargetLabelKey> = {
  tikz: 'comparison.tikz',
  vega: 'comparison.vega',
  css: 'comparison.css',
  react: 'comparison.react',
};

/** 判断未知值是否是受支持的对照对象。 */
export const isComparisonTarget = (value: unknown): value is ComparisonTargetValue =>
  typeof value === 'string' && ComparisonTargetList.includes(value as ComparisonTargetValue);
