import type { FC } from 'react';

import { Axis, IntervalMark, PathMark, Plot, PointMark, Scaffold, Track } from '@retikz/plot-react';

import { polarTrackRows } from './coordinate-composition-tracks-polar.data';

const Demo: FC = () => (
  <Plot data={polarTrackRows} coordinate={{ type: 'polar2D' }} width={520} height={330}>
    <Scaffold id="radar" sharedRoles={['x']} spacing={{ trackGap: 8 }}>
      <Axis dimension="x" grid title="area" />
      <Track id="signal" band={{ role: 'y', start: 0.1, end: 0.4 }}>
        <Axis dimension="y" title="signal" />
        <PathMark x="area" y="signal" order="order" stroke="darkorange" strokeWidth={2.5} />
        <PointMark x="area" y="signal" fill="moccasin" stroke="darkorange" strokeWidth={1} />
      </Track>
      <Track id="capacity" band={{ role: 'y', start: 0.5, end: 0.76 }}>
        <Axis dimension="y" title="capacity" />
        <PathMark x="area" y="capacity" order="order" stroke="steelblue" strokeWidth={2} />
        <PointMark x="area" y="capacity" fill="lightblue" stroke="steelblue" strokeWidth={1} />
      </Track>
      <Track id="sector" band={{ role: 'y', start: 0.86, end: 1 }}>
        <IntervalMark
          x="area"
          y="outer"
          color="area"
          padAngle={2}
          stroke="#ffffff"
          strokeWidth={1}
          fillOpacity={0.72}
        />
      </Track>
    </Scaffold>
  </Plot>
);

export default Demo;
