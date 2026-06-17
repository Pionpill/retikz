import { Axis, IntervalMark, Plot, Transform } from '@retikz/plot-react';
import type { FC } from 'react';

import { measurements } from './interval-histogram.data';

/** Continuous x interval: bin emits binStart/binEnd, IntervalMark reads them as extent bounds. */
const Demo: FC = () => (
  <Plot data={measurements} width={420} height={260} style={{ maxWidth: '100%', height: 'auto' }}>
    <Transform kind="bin" field="measurement" count={8} />
    <IntervalMark x0="binStart" x1="binEnd" y="binValue" />
    <Axis dimension="x" />
    <Axis dimension="y" grid />
  </Plot>
);

export default Demo;
