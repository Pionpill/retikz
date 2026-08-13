import type { ValueOf } from '@retikz/foundation';

/** Point family 的封闭类型判别值 */
export const PointChartType = {
  Scatter: 'scatter',
  Bubble: 'bubble',
  ConnectedScatter: 'connected-scatter',
} as const;

/** Point family 类型判别值 */
export type PointChartTypeValue = ValueOf<typeof PointChartType>;
