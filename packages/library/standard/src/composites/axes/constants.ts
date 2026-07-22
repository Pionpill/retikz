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
