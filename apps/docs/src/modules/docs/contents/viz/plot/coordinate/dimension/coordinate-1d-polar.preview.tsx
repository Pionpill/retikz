import { Plot, PlotAxis, PlotScale, PointMark } from '@retikz/plot-react';

import { oneDimensionalEvents } from './coordinate-1d-playground.data';

/** 一维投影参数 */
export type Coordinate1DPolarValues = { radius: number; startAngle: number; sweepAngle: number };

/** 投影事件时刻 */
export const renderCoordinate1DPolar = (values: Coordinate1DPolarValues) => (
  <Plot
    data={oneDimensionalEvents}
    coordinate={{
      type: 'polar1D',
      radius: values.radius,
      startAngle: values.startAngle,
      endAngle: values.startAngle + values.sweepAngle,
    }}
    width={270}
    height={270}
  >
    <PlotScale dimension="x" type="linear" domain={[0, 24]} />
    <PointMark
      encodings={{ position: { x: { field: 'hour' } } }}
      properties={{ size: 11, fill: '#bfdbfe', stroke: '#1d4ed8', strokeWidth: 1.5 }}
    />
    <PlotAxis dimension="x" />
  </Plot>
);
