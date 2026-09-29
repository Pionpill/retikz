import { Plot, PlotAxis, PointMark } from '@retikz/plot-react';

import { points } from './point-api.data';
import { pointNodeShapeOf } from './point-node-shape.controls';

/** 图形参数 */
export type PointNodeShapePreviewValues = {
  coordinate: 'cartesian2D' | 'polar2D';
  size: number;
  rotate: number;
  shape: 'circle' | 'rectangle' | 'diamond' | 'star' | 'polygon';
  starPoints: number;
  polygonSides: number;
};

/** 绘制示例图形 */
export const PointNodeShapePreview = (values: PointNodeShapePreviewValues) => (
  <Plot data={points} width={400} height={280} coordinate={values.coordinate === 'polar2D' ? 'polar2D' : undefined}>
    <PointMark
      x="x"
      y="y"
      color="region"
      size={values.size}
      rotate={values.rotate}
      shape={pointNodeShapeOf({
        shape: values.shape,
        size: values.size,
        starPoints: values.starPoints,
        polygonSides: values.polygonSides,
      })}
      label="label"
      labelPosition="top"
      labelDistance={8}
    />
    <PlotAxis dimension="x" />
    <PlotAxis dimension="y" grid />
  </Plot>
);
