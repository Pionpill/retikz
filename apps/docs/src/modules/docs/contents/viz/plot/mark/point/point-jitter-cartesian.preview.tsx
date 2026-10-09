import { Plot, PlotAxis, BuiltinPlotScale, PointMark } from '@retikz/plot-react';

import { cartesianJitterOperationOf } from './point-jitter-cartesian.controls';
import { jitterPoints } from './point-jitter.data';

/** 图形参数 */
export type PointJitterCartesianPreviewValues = {
  'point-jitter-cartesian-span-kind': 'range' | 'ratio';
  'point-jitter-cartesian-ratio': number;
  'point-jitter-cartesian-range': number;
  'point-jitter-cartesian-distribution': 'uniform' | 'normal';
  'point-jitter-cartesian-sigma': number;
  'point-jitter-cartesian-seed': number;
};

/** 绘制示例图形 */
export const PointJitterCartesianPreview = (values: PointJitterCartesianPreviewValues) => (
  <Plot data={jitterPoints} width={400} height={280}>
    <PointMark
      x="group"
      y="value"
      size={6}
      color={{ kind: 'constant', value: '#2563eb' }}
      placement={{ adjustments: [cartesianJitterOperationOf(values)] }}
    />
    <BuiltinPlotScale dimension="x" type="point" />
    <BuiltinPlotScale dimension="y" type="linear" domainPadding={{ upper: 6 }} />
    <PlotAxis dimension="x" />
    <PlotAxis dimension="y" grid />
  </Plot>
);
