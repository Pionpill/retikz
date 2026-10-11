import { Plot, PlotAxis, BuiltinPlotScale, PointMark } from '@retikz/plot-react';

import { POINT_JITTER_POLAR_CONTROL_IDS, polarJitterOperationOf } from './point-jitter-polar.controls';
import { polarJitterPoints } from './point-jitter.data';

/** 图形参数 */
export type PointJitterPolarPreviewValues = {
  'point-jitter-polar-scale': 'discrete' | 'continuous';
  'point-jitter-polar-ratio': number;
  'point-jitter-polar-range': number;
  'point-jitter-polar-distribution': 'uniform' | 'normal';
  'point-jitter-polar-sigma': number;
  'point-jitter-polar-seed': number;
};

/** 绘制示例图形 */
export const PointJitterPolarPreview = (values: PointJitterPolarPreviewValues) => {
  const continuous = values[POINT_JITTER_POLAR_CONTROL_IDS.scale] === 'continuous';
  return (
    <Plot data={polarJitterPoints} width={360} height={360} coordinate={{ type: 'polar2D' }}>
      <PointMark
        x={continuous ? 'angle' : 'group'}
        y="value"
        size={5}
        color={{ kind: 'constant', value: '#7c3aed' }}
        placement={{
          adjustments: [polarJitterOperationOf(values)],
        }}
      />
      {continuous ? (
        <BuiltinPlotScale dimension="x" type="linear" domain={[0, 360]} />
      ) : (
        <BuiltinPlotScale dimension="x" type="point" />
      )}
      <BuiltinPlotScale dimension="y" type="linear" domainPadding={{ upper: continuous ? 5 : 28 }} />
      <PlotAxis dimension="x" />
      <PlotAxis dimension="y" grid />
    </Plot>
  );
};
