import { Plot, PlotAxis, PointMark } from '@retikz/plot-react';

import { points } from './point-api.data';

/** 图形参数 */
export type PointPositionPreviewValues = {
  coordinate: 'cartesian2D' | 'polar2D';
  xField: 'x' | 'y' | 'pop';
  yField: 'x' | 'y' | 'pop';
  colorMode: 'none' | 'region';
  sizeMode: 'fixed' | 'population';
};

/** 绘制示例图形 */
export const PointPositionPreview = (values: PointPositionPreviewValues) => (
  <Plot data={points} width={400} height={280} coordinate={values.coordinate === 'polar2D' ? 'polar2D' : undefined}>
    <PointMark
      x={values.xField}
      y={values.yField}
      color={values.colorMode === 'region' ? 'region' : undefined}
      size={values.sizeMode === 'population' ? 'pop' : 10}
    />
    <PlotAxis dimension="x" />
    <PlotAxis dimension="y" grid />
  </Plot>
);
