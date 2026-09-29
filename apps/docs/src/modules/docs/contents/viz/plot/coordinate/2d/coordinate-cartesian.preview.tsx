import { IntervalMark, PathMark, Plot, PlotAxis, PlotScale, PointMark } from '@retikz/plot-react';

import { coordinate2DRows } from './coordinate-2d.data';

/** 图形参数 */
export type CoordinateCartesianValues = {
  markType: 'point' | 'line' | 'interval';
  marginTop: number;
  marginRight: number;
  marginBottom: number;
  marginLeft: number;
  showGrid: boolean;
};

/** 按 control 状态渲染笛卡尔二维坐标系 */
export const renderCoordinateCartesian = (values: CoordinateCartesianValues) => (
  <Plot
    data={coordinate2DRows}
    width={380}
    height={280}
    margin={{
      top: values.marginTop,
      right: values.marginRight,
      bottom: values.marginBottom,
      left: values.marginLeft,
    }}
  >
    <PlotScale dimension="y" type="linear" domainPadding={0} />
    {values.markType === 'point' ? (
      <PointMark x="category" y="value" />
    ) : values.markType === 'line' ? (
      <PathMark x="category" y="value" order="order" closed={false} />
    ) : (
      <IntervalMark x="category" y="value" />
    )}
    <PlotAxis dimension="x" />
    <PlotAxis dimension="y" grid={values.showGrid} />
  </Plot>
);
