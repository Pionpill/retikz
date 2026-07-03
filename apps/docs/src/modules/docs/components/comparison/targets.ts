import type { ValueOf } from '@retikz/core';

/** 可选对照对象枚举。 */
export const ComparisonTarget = {
  /** TikZ / PGF 绘图语法 */
  TikZ: 'tikz',
} as const;

/** 可选对照对象。 */
export type ComparisonTargetValue = ValueOf<typeof ComparisonTarget>;

/** 对照对象展示顺序。 */
export const ComparisonTargetList = [ComparisonTarget.TikZ] as const satisfies ReadonlyArray<ComparisonTargetValue>;

/** 对照对象 i18n key。 */
export type ComparisonTargetLabelKey = 'comparison.tikz';

/** 对照对象到 i18n key 的映射。 */
export const ComparisonTargetLabelKeys: Record<ComparisonTargetValue, ComparisonTargetLabelKey> = {
  /** TikZ label */
  tikz: 'comparison.tikz',
};

/** 判断未知值是否是受支持的对照对象。 */
export const isComparisonTarget = (value: unknown): value is ComparisonTargetValue =>
  typeof value === 'string' && ComparisonTargetList.includes(value as ComparisonTargetValue);
