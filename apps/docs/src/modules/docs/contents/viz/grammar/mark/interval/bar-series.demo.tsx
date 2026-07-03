import type { FC } from 'react';

import { Axis, IntervalMark, Plot } from '@retikz/plot-react';

import { sales } from './bar-grouped.data';

const Demo: FC = () => (
  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
    <Plot data={sales} width={280} height={200} style={{ maxWidth: '100%', height: 'auto' }}>
      <IntervalMark x="quarter" y="revenue" group="product" color="product" arrangement="dodge" />
      <Axis dimension="x" />
      <Axis dimension="y" grid />
    </Plot>
    <Plot data={sales} width={280} height={200} style={{ maxWidth: '100%', height: 'auto' }}>
      <IntervalMark x="quarter" y="revenue" group="product" color="product" arrangement="stack" />
      <Axis dimension="x" />
      <Axis dimension="y" grid />
    </Plot>
    <Plot data={sales} width={280} height={200} style={{ maxWidth: '100%', height: 'auto' }}>
      <IntervalMark x="quarter" y="revenue" group="product" color="product" arrangement="normalize-stack" />
      <Axis dimension="x" />
      <Axis dimension="y" grid />
    </Plot>
  </div>
);

export default Demo;
