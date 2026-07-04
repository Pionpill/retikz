import type { FC } from 'react';

import { Axis, PathMark, Plot, Scale } from '@retikz/plot-react';

import { tickDensityRows } from './axis-tick-density.data';

/** Generate fixed-step candidate ticks, sample visible ticks, and render triangle marks through core shape. */
const Demo: FC = () => (
  <Plot data={tickDensityRows} width={360} height={220} style={{ maxWidth: '100%', height: 'auto' }}>
    <Scale dimension="x" type="linear" domain={[0, 100]} />
    <Scale dimension="y" type="linear" domain={[0, 40]} />
    <PathMark x="x" y="y" order="x" stroke="#2563eb" />
    <Axis
      dimension="x"
      ticks={{
        interval: { kind: 'number', step: 10 },
        density: { kind: 'sample', maxCount: 6, minGap: 36 },
        mark: { kind: 'triangle', size: 6, orientation: 'outward', fill: '#334155' },
      }}
      title="Progress"
    />
    <Axis dimension="y" grid ticks={{ count: 5 }} title="Count" />
  </Plot>
);

export default Demo;
