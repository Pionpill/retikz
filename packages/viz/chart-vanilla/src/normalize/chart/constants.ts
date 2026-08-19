/** Chart presentation plain authoring 的相对位置 */
export const ChartPresentationPosition = {
  /** 位于 Plot 之前 */
  Top: 'top',
  /** 位于 Plot 之后 */
  Bottom: 'bottom',
} as const;

/** Chart presentation plain authoring 位置取值 */
export type ChartPresentationPositionValue = (typeof ChartPresentationPosition)[keyof typeof ChartPresentationPosition];
