import type { ValueOf } from '@retikz/core';

/** Chart composite 的私有命名空间 */
export const CHART_NAMESPACE = 'chart' as const;

/** Chart owner 内建 variant 的封闭判别值 */
export const ChartType = {
  Scatter: 'scatter',
  Bubble: 'bubble',
  ConnectedScatter: 'connected-scatter',
} as const;

/** Chart owner 内建 variant 判别值 */
export type ChartTypeValue = ValueOf<typeof ChartType>;
