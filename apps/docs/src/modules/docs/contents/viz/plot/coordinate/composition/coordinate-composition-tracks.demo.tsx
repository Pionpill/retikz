import type { FC } from 'react';

import { Axis, PathMark, Plot, PointMark, Scaffold, Track } from '@retikz/plot-react';

import { operationsRows } from './coordinate-composition-tracks.data';

const Demo: FC = () => (
  <Plot data={operationsRows} width={560} height={330}>
    <Scaffold id="ops" sharedRoles={['x']} spacing={{ trackGap: 6 }}>
      <Axis dimension="x" grid title="trading day" />
      <Track id="trend" band={{ role: 'y', start: 0, end: 0.28 }}>
        <Axis dimension="y" title="trend" />
        <PathMark x="day" y="trend" order="day" stroke="#f97316" strokeWidth={2.5} lineCap="round" lineJoin="round" />
      </Track>
      <Track id="drawdown" band={{ role: 'y', start: 0.36, end: 0.64 }}>
        <Axis dimension="y" title="drawdown" />
        <PathMark
          x="day"
          y="drawdown"
          order="day"
          closure={{ kind: 'baseline', baseline: 0 }}
          fill="rgba(148, 163, 184, 0.32)"
          stroke="none"
        />
        <PathMark x="day" y="drawdown" order="day" stroke="#64748b" strokeWidth={2} lineCap="round" lineJoin="round" />
      </Track>
      <Track id="signal" band={{ role: 'y', start: 0.72, end: 1 }}>
        <Axis dimension="y" title="signal" />
        <PathMark x="day" y="signal" order="day" stroke="#0891b2" strokeWidth={2} lineCap="round" lineJoin="round" />
        <PointMark x="day" y="signal" fill="#ecfeff" stroke="#0891b2" strokeWidth={1.5} size={7} />
      </Track>
    </Scaffold>
  </Plot>
);

export default Demo;
