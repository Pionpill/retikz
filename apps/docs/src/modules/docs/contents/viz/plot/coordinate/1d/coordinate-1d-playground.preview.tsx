import { Plot, PlotAxis, BuiltinPlotScale, PointMark } from '@retikz/plot-react';
import type { InputPlotCoordinate } from '@retikz/plot-vanilla';

import { oneDimensionalEvents } from './coordinate-1d-playground.data';

/** 图形参数 */
export type Coordinate1dPlaygroundPreviewValues = {
  coordinate: 'cartesian1D' | 'polar1D';
  orientation: 'horizontal' | 'vertical';
  radius: number;
  startAngle: number;
  sweepAngle: number;
  pointSize: number;
  pointFill: string;
  pointStroke: string;
  pointStrokeWidth: number;
  pointOpacity: number;
  axisVisible: boolean;
  axisStroke: string;
  axisStrokeWidth: number;
};

/** 绘制示例图形 */
export const Coordinate1dPlaygroundPreview = (values: Coordinate1dPlaygroundPreviewValues) => {
  const coordinate: InputPlotCoordinate =
    values.coordinate === 'cartesian1D'
      ? {
          type: 'cartesian1D',
          orientation: values.orientation,
        }
      : {
          type: 'polar1D',
          radius: values.radius,
          startAngle: values.startAngle,
          endAngle: values.startAngle + values.sweepAngle,
        };

  return (
    <Plot data={oneDimensionalEvents} coordinate={coordinate} width={270} height={270}>
      <BuiltinPlotScale dimension="x" type="linear" domain={[0, 24]} />
      <PointMark
        x="hour"
        size={values.pointSize}
        fill={{
          kind: 'constant',
          value: values.pointFill,
        }}
        stroke={{
          kind: 'constant',
          value: values.pointStroke,
        }}
        strokeWidth={values.pointStrokeWidth}
        opacity={values.pointOpacity}
      />
      {values.axisVisible ? (
        <PlotAxis
          dimension="x"
          line={{
            stroke: values.axisStroke,
            strokeWidth: values.axisStrokeWidth,
          }}
        />
      ) : null}
    </Plot>
  );
};
