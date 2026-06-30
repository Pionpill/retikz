import type { FC } from 'react';

import { Axis, IntervalMark, Plot } from '@retikz/plot-react';

import { slots } from './rect-grid.data';
import { matrix } from './rect-heatmap.data';

const Demo: FC = () => (
  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
    <Plot
      data={matrix}
      model={[
        { name: 'row', type: 'categorical' },
        { name: 'col', type: 'categorical' },
        { name: 'value', type: 'continuous' },
      ]}
      width={280}
      height={240}
      style={{ maxWidth: '100%', height: 'auto' }}
    >
      <IntervalMark x="col" y="row" color="value" bounds={{ x: { kind: 'band' }, y: { kind: 'band' } }} />
      <Axis dimension="x" />
      <Axis dimension="y" />
    </Plot>
    <Plot
      data={slots}
      model={[
        { name: 'day', type: 'categorical' },
        { name: 'slot', type: 'categorical' },
      ]}
      width={280}
      height={240}
      style={{ maxWidth: '100%', height: 'auto' }}
    >
      <IntervalMark x="day" y="slot" bounds={{ x: { kind: 'band' }, y: { kind: 'band' } }} />
      <Axis dimension="x" />
      <Axis dimension="y" />
    </Plot>
  </div>
);

export default Demo;
