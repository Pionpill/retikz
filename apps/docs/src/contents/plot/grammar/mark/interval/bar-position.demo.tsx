import { Axis, IntervalMark, Plot } from '@retikz/plot-react';
import type { FC } from 'react';

import { revenue } from './bar-basic.data';

const Demo: FC = () => (
  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
    <Plot data={revenue} width={300} height={220} style={{ maxWidth: '100%', height: 'auto' }}>
      <IntervalMark x="quarter" y="value" />
      <Axis dimension="x" />
      <Axis dimension="y" grid />
    </Plot>
    <Plot data={revenue} width={300} height={220} style={{ maxWidth: '100%', height: 'auto' }}>
      <IntervalMark x="value" y="quarter" direction="horizontal" color="quarter" />
      <Axis dimension="x" grid />
      <Axis dimension="y" />
    </Plot>
  </div>
);

export default Demo;
