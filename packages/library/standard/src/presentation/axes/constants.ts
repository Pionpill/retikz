import type { ValueOf } from '@retikz/foundation';
/** Axes 坐标轴端点的箭头模式 */
export const AxesArrowMode = {
  None: 'none',
  Positive: 'positive',
  Negative: 'negative',
  Both: 'both',
} as const;

/** Axes 规则刻度覆盖的轴向范围 */
export const AxesTickExtent = {
  Positive: 'positive',
  Negative: 'negative',
  Both: 'both',
} as const;

/** Axes 刻度线段相对轴线的伸出侧 */
export const AxesTickSide = {
  Positive: 'positive',
  Negative: 'negative',
  Both: 'both',
} as const;

/** Axes 刻度来源类型 */
export const AxesTickSourceKind = {
  Spacing: 'spacing',
  Values: 'values',
} as const;

/** Axes 轴名所在的轴端 */
export const AxesLabelEnd = {
  Positive: 'positive',
  Negative: 'negative',
} as const;

/** Axes 坐标轴端点箭头模式取值 */
export type AxesArrowMode = ValueOf<typeof AxesArrowMode>;

/** Axes 规则刻度覆盖范围取值 */
export type AxesTickExtent = ValueOf<typeof AxesTickExtent>;

/** Axes 刻度线段伸出侧取值 */
export type AxesTickSide = ValueOf<typeof AxesTickSide>;

/** Axes 刻度来源类型取值 */
export type AxesTickSourceKind = ValueOf<typeof AxesTickSourceKind>;

/** Axes 轴名端点取值 */
export type AxesLabelEnd = ValueOf<typeof AxesLabelEnd>;
