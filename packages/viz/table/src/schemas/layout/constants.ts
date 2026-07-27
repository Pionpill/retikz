/** Table 轨道尺寸判别值 */
export const TableTrackSizeKind = {
  /** 固定尺寸 */
  Fixed: 'fixed',
  /** 内容自然尺寸 */
  Auto: 'auto',
  /** 剩余空间弹性份额 */
  Fraction: 'fraction',
  /** 带上下界的尺寸 */
  Minmax: 'minmax',
} as const;
