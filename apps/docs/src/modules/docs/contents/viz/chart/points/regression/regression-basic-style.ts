import type { IRRegressionTrendProperties } from '@retikz/chart/point/regression';

/** Regression Showcase 可选趋势线型 */
export type RegressionTrendLineStyle = 'solid' | 'dashed';

/** 把趋势线 controls 映射为 Regression trend properties */
export const regressionTrendPropertiesOf = (
  grouped: boolean,
  stroke: string,
  lineStyle: RegressionTrendLineStyle,
  strokeWidth: number,
  strokeOpacity: number,
): IRRegressionTrendProperties => ({
  ...(!grouped ? { stroke } : {}),
  ...(lineStyle === 'dashed' ? { dashPattern: [8, 4] } : {}),
  strokeWidth,
  strokeOpacity,
});
