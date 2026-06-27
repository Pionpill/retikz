import { Axis, IntervalMark, Plot, Transform } from '@retikz/plot-react';
import type { FC } from 'react';

import { laborCosts } from './bar-variable-width.data';
import { measurements } from './interval-histogram.data';

/** Continuous x interval: bin emits binStart/binEnd, IntervalMark reads them as extent bounds. */
const Demo: FC = () => (
  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
    <Plot data={measurements} width={360} height={240} style={{ maxWidth: '100%', height: 'auto' }}>
      <Transform kind="bin" field="measurement" count={8} />
      <IntervalMark x0="binStart" x1="binEnd" y="binCount" />
      <Axis dimension="x" />
      <Axis dimension="y" grid />
    </Plot>
    <Plot data={laborCosts} width={360} height={240} style={{ maxWidth: '100%', height: 'auto' }}>
      <IntervalMark x="country" y="cost" width="gdp" color="country" />
      <Axis dimension="x" />
      <Axis dimension="y" grid />
    </Plot>
  </div>
);

export default Demo;
