import type { ValueOf } from '@retikz/core';

/** 可选对照对象枚举。 */
export const ComparisonTargets = {
  /** TikZ / PGF 绘图语法 */
  TikZ: 'tikz',
} as const;

/** 可选对照对象。 */
export type ComparisonTarget = ValueOf<typeof ComparisonTargets>;

/** 对照对象展示顺序。 */
export const COMPARISON_TARGETS = [ComparisonTargets.TikZ] as const satisfies ReadonlyArray<ComparisonTarget>;

/** 对照对象 i18n key。 */
export type ComparisonTargetLabelKey = 'comparison.tikz';

/** 对照对象到 i18n key 的映射。 */
export const ComparisonTargetLabelKeys: Record<ComparisonTarget, ComparisonTargetLabelKey> = {
  /** TikZ label */
  tikz: 'comparison.tikz',
};

/** 判断未知值是否是受支持的对照对象。 */
export const isComparisonTarget = (value: unknown): value is ComparisonTarget =>
  typeof value === 'string' && COMPARISON_TARGETS.includes(value as ComparisonTarget);
