import { IntervalMark, PathMark, Plot, PlotAxis, PlotScale, PointMark } from '@retikz/plot-react';

import { coordinate2DRows } from './coordinate-2d.data';

/** 图形参数 */
export type CoordinatePolarValues = {
  markType: 'point' | 'line' | 'interval';
  markInterpolation: 'inherit' | 'polar' | 'chord';
  coordinateInterpolation: 'polar' | 'chord' | 'auto';
  innerRadius: number;
  startAngle: number;
  sweepAngle: number;
};

/** 按 control 状态渲染极坐标二维坐标系 */
export const renderCoordinatePolar = (values: CoordinatePolarValues) => (
  <Plot
    data={coordinate2DRows}
    width={300}
    height={300}
    coordinate={{
      type: 'polar2D',
      interpolation: values.coordinateInterpolation === 'auto' ? undefined : values.coordinateInterpolation,
      innerRadius: values.innerRadius,
      startAngle: values.startAngle,
      endAngle: values.startAngle + values.sweepAngle,
    }}
  >
    <PlotScale dimension="y" type="linear" domainPadding={0} />
    {values.markType === 'point' ? (
      <PointMark x="category" y="value" />
    ) : values.markType === 'line' ? (
      <PathMark
        x="category"
        y="value"
        order="order"
        closed
        interpolation={values.markInterpolation === 'inherit' ? undefined : values.markInterpolation}
      />
    ) : (
      <IntervalMark
        x="category"
        y="value"
        interpolation={values.markInterpolation === 'inherit' ? undefined : values.markInterpolation}
      />
    )}
    <PlotAxis dimension="x" />
    <PlotAxis dimension="y" grid />
  </Plot>
);
