import type { FC } from 'react';

import { Axis, PathMark, Plot, PointMark, Scaffold, Track } from '@retikz/plot-react';

import { operationsRows } from './coordinate-composition-tracks.data';

const Demo: FC = () => (
  <Plot data={operationsRows} width={560} height={250}>
    <Scaffold id="ops" sharedRoles={['x']} layout={{ trackGap: 24 }}>
      <Track id="incidents" band={{ role: 'y', start: 0, end: 0.5 }} />
      <Track id="load" band={{ role: 'y', start: 0.5, end: 1 }} />
    </Scaffold>
    <Axis dimension="x" scaffoldId="ops" grid title="week" />
    <Axis dimension="y" trackId="incidents" title="incidents" />
    <Axis dimension="y" trackId="load" title="load" />
    <PathMark trackId="incidents" x="week" y="incidents" order="week" stroke="darkorange" strokeWidth={2.5} />
    <PathMark trackId="load" x="week" y="load" order="week" stroke="steelblue" strokeWidth={2} />
    <PointMark trackId="load" x="week" y="load" fill="lightblue" stroke="steelblue" strokeWidth={1} />
  </Plot>
);

export default Demo;
