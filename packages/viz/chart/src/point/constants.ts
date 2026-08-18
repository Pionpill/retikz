import type { ValueOf } from '@retikz/foundation';

/** Point 类内建 Chart 类型 */
export const PointChartType = {
  /** 散点图类型，根据位置与视觉通道生成主 Point 标记 */
  Scatter: 'scatter',
  /** 气泡图类型，根据位置与定量尺寸通道生成主 Point 标记 */
  Bubble: 'bubble',
  /** 连接散点图类型，根据位置、顺序与分组生成连接路径和 Point 标记 */
  ConnectedScatter: 'connected-scatter',
} as const;

/** Point 类 Chart 类型取值 */
export type PointChartTypeValue = ValueOf<typeof PointChartType>;
