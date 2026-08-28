import type { InputPlotCoordinate } from '@retikz/plot-vanilla';

import { Plot, PlotAxis, PlotScale, PointMark } from '@retikz/plot-react';

import { defineControlledPreview } from '@/modules/docs/preview';

import {
  COORDINATE_1D_PLAYGROUND_CONTROL_IDS,
  coordinate1DPlaygroundControls,
  previewControlContract,
} from './coordinate-1d-playground.controls';
import { oneDimensionalEvents } from './coordinate-1d-playground.data';

/** 注册回退使用的一维坐标系控件 */
export const previewControls = coordinate1DPlaygroundControls;

const controlledPreview = defineControlledPreview(previewControlContract, values => {
  const coordinate: InputPlotCoordinate =
    values[COORDINATE_1D_PLAYGROUND_CONTROL_IDS.coordinate] === 'cartesian1D'
      ? {
          type: 'cartesian1D',
          orientation: values[COORDINATE_1D_PLAYGROUND_CONTROL_IDS.orientation],
        }
      : {
          type: 'polar1D',
          radius: values[COORDINATE_1D_PLAYGROUND_CONTROL_IDS.radius],
          startAngle: values[COORDINATE_1D_PLAYGROUND_CONTROL_IDS.startAngle],
          endAngle:
            values[COORDINATE_1D_PLAYGROUND_CONTROL_IDS.startAngle] +
            values[COORDINATE_1D_PLAYGROUND_CONTROL_IDS.sweepAngle],
        };

  return (
    <Plot
      data={oneDimensionalEvents}
      coordinate={coordinate}
      width={270}
      height={270}
      style={{ maxWidth: '100%', height: 'auto' }}
    >
      <PlotScale dimension="x" type="linear" domain={[0, 24]} />
      <PointMark
        x="hour"
        size={values[COORDINATE_1D_PLAYGROUND_CONTROL_IDS.pointSize]}
        fill={{
          kind: 'constant',
          value: values[COORDINATE_1D_PLAYGROUND_CONTROL_IDS.pointFill],
        }}
        stroke={{
          kind: 'constant',
          value: values[COORDINATE_1D_PLAYGROUND_CONTROL_IDS.pointStroke],
        }}
        strokeWidth={values[COORDINATE_1D_PLAYGROUND_CONTROL_IDS.pointStrokeWidth]}
        opacity={values[COORDINATE_1D_PLAYGROUND_CONTROL_IDS.pointOpacity]}
      />
      {values[COORDINATE_1D_PLAYGROUND_CONTROL_IDS.axisVisible] ? (
        <PlotAxis
          dimension="x"
          line={{
            stroke: values[COORDINATE_1D_PLAYGROUND_CONTROL_IDS.axisStroke],
            strokeWidth: values[COORDINATE_1D_PLAYGROUND_CONTROL_IDS.axisStrokeWidth],
          }}
        />
      ) : null}
    </Plot>
  );
});

/** canonical 状态派生的稳定源码配置 */
export const previewSource = controlledPreview.source;

/** 一维直线与圆周坐标系试验场 */
export default controlledPreview.Component;
