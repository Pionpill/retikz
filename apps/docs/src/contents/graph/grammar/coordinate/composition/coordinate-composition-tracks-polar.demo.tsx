import type { FC } from 'react';

import { Axis, PathMark, Plot, PointMark, Scaffold, Track } from '@retikz/plot-react';

import { polarTrackRows } from './coordinate-composition-tracks-polar.data';

const Demo: FC = () => (
  <Plot data={polarTrackRows} coordinate={{ type: 'polar2D' }} width={520} height={330}>
    <Scaffold id="radar" sharedRoles={['x']} layout={{ trackGap: 18 }}>
      <Track id="signal" band={{ role: 'y', start: 0.12, end: 0.48 }} />
      <Track id="capacity" band={{ role: 'y', start: 0.58, end: 0.96 }} />
    </Scaffold>
    <Axis dimension="x" scaffoldId="radar" grid title="area" />
    <Axis dimension="y" trackId="signal" title="signal" />
    <Axis dimension="y" trackId="capacity" title="capacity" />
    <PathMark trackId="signal" x="area" y="signal" order="order" stroke="darkorange" strokeWidth={2.5} />
    <PointMark trackId="signal" x="area" y="signal" fill="moccasin" stroke="darkorange" strokeWidth={1} />
    <PathMark trackId="capacity" x="area" y="capacity" order="order" stroke="steelblue" strokeWidth={2} />
    <PointMark trackId="capacity" x="area" y="capacity" fill="lightblue" stroke="steelblue" strokeWidth={1} />
  </Plot>
);

export default Demo;
