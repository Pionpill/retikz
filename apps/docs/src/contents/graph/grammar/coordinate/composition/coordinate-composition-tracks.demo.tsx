import type { PlotSpec } from '@retikz/plot';
import type { FC } from 'react';

import { Axis, PathMark, Plot, PointMark, Scale } from '@retikz/plot-react';

import { operationsRows } from './coordinate-composition.data';

const composition = {
  defaultScope: 'incidents',
  scaffolds: [
    {
      id: 'ops',
      coordinate: { type: 'cartesian2D' },
      sharedRoles: ['x'],
      tracks: [
        { id: 'incidents', band: { role: 'y', start: 0, end: 0.42 } },
        { id: 'load', band: { role: 'y', start: 0.58, end: 1 } },
      ],
    },
  ],
  scopes: [
    { id: 'incidents', placement: { kind: 'track', scaffold: 'ops', track: 'incidents' } },
    { id: 'load', placement: { kind: 'track', scaffold: 'ops', track: 'load' } },
  ],
  layout: { trackGap: 24, axisGap: 8, labelGap: 6 },
  guidePolicy: { gridPlacement: 'sharedRole', trackLabels: 'inline' },
} satisfies NonNullable<PlotSpec['composition']>;

const Demo: FC = () => (
  <Plot data={operationsRows} width={520} height={300} composition={composition} style={{ maxWidth: '100%', height: 'auto' }}>
    <Scale dimension="x" type="linear" />
    <Scale dimension="y" type="linear" />
    <PathMark coordinateScope="incidents" x="week" y="incidents" order="week" stroke="darkorange" strokeWidth={2.5} />
    <PathMark coordinateScope="load" x="week" y="load" order="week" stroke="steelblue" strokeWidth={2} />
    <PointMark coordinateScope="load" x="week" y="load" fill="lightblue" stroke="steelblue" strokeWidth={1} />
    <Axis dimension="x" coordinateScope="incidents" placement={{ kind: 'side', side: 'bottom' }} grid title="week" />
    <Axis dimension="y" coordinateScope="incidents" placement={{ kind: 'side', side: 'left' }} title="incidents" />
    <Axis dimension="y" coordinateScope="load" placement={{ kind: 'side', side: 'left' }} title="load" />
  </Plot>
);

export default Demo;
