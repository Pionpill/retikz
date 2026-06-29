import type { PlotSpec } from '@retikz/plot';
import type { FC } from 'react';

import { Axis, PathMark, Plot, PointMark, Scale } from '@retikz/plot-react';

import { weatherRows } from './coordinate-composition.data';

const composition = {
  defaultScope: 'temperature',
  scopes: [
    { id: 'temperature', coordinate: { type: 'cartesian2D' } },
    {
      id: 'rainfall',
      coordinate: { type: 'cartesian2D' },
      placement: { kind: 'overlay', target: 'temperature' },
    },
  ],
  layout: { axisGap: 12, labelGap: 6, padding: { left: 6, right: 6 } },
} satisfies NonNullable<PlotSpec['composition']>;

const Demo: FC = () => (
  <Plot data={weatherRows} width={440} height={260} composition={composition} style={{ maxWidth: '100%', height: 'auto' }}>
    <Scale dimension="x" type="linear" />
    <Scale dimension="y" type="linear" />
    <PathMark x="day" y="temperature" order="day" stroke="darkorange" strokeWidth={2.5} />
    <PathMark coordinateScope="rainfall" x="day" y="rainfall" order="day" stroke="steelblue" strokeWidth={2} />
    <PointMark coordinateScope="rainfall" x="day" y="rainfall" fill="lightblue" stroke="steelblue" strokeWidth={1} />
    <Axis dimension="x" coordinateScope="temperature" placement={{ kind: 'side', side: 'bottom' }} title="day" />
    <Axis
      dimension="y"
      coordinateScope="temperature"
      placement={{ kind: 'side', side: 'left' }}
      title="temperature"
    />
    <Axis dimension="y" coordinateScope="rainfall" placement={{ kind: 'side', side: 'right' }} title="rainfall" />
  </Plot>
);

export default Demo;
