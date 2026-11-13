import { Plot, PlotAxis, PlotScale, PointMark } from '@retikz/plot-react';

import { oneDimensionalEvents } from './coordinate-1d-playground.data';

/** 一维投影参数 */
export type Coordinate1DPlaygroundValues = { orientation: 'horizontal' | 'vertical' };

/** 投影事件时刻 */
export const renderCoordinate1DPlayground = (values: Coordinate1DPlaygroundValues) => (
  <Plot
    data={oneDimensionalEvents}
    coordinate={{ type: 'cartesian1D', orientation: values.orientation }}
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
