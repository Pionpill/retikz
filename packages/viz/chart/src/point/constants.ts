import type { ValueOf } from '@retikz/foundation';

/** Point family 的稳定 family key */
export const ChartFamily = {
  Point: 'point',
} as const;

/** Point family key 取值 */
export type ChartFamilyValue = ValueOf<typeof ChartFamily>;

/** Point family 的全局唯一 recipe key */
export const ChartType = {
  Bubble: 'bubble',
  ConnectedScatter: 'connected-scatter',
  Regression: 'regression',
  RangedDot: 'ranged-dot',
  Scatter: 'scatter',
  Strip: 'strip',
} as const;

/** Point recipe key 取值 */
export type ChartTypeValue = ValueOf<typeof ChartType>;
