import type { FC } from 'react';

import { Axis, PathMark, Plot } from '@retikz/plot-react';

import { speedEfficiency } from './axis-grid-source.data';

/** Grid source: keep axis ticks sparse while grid lines use an independent tick source plus minor lines. */
const Demo: FC = () => (
  <Plot data={speedEfficiency} width={380} height={220} style={{ maxWidth: '100%', height: 'auto' }}>
    <PathMark x="speed" y="efficiency" order="speed" stroke="#2563eb" strokeWidth={1.6} />
    <Axis
      dimension="x"
      title="Speed"
      ticks={{ values: [0, 50, 100] }}
      grid={{
        ticks: { interval: { kind: 'number', step: 20 } },
        stroke: '#94a3b8',
        drawOpacity: 0.5,
        lineCap: 'round',
        minor: {
          ticks: { interval: { kind: 'number', step: 10 } },
          stroke: '#cbd5e1',
          drawOpacity: 0.35,
          dashPattern: [2, 3],
        },
      }}
    />
    <Axis dimension="y" title={{ text: 'Efficiency', orientation: 'horizontal', placement: 'at-end' }} />
  </Plot>
);

export default Demo;
