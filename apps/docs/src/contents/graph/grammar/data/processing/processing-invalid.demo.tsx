import type { DataModel } from '@retikz/plot';
import type { FC } from 'react';

import { Axis, IntervalMark, Plot } from '@retikz/plot-react';
import { Layout } from '@retikz/react';

import { cleanRows, dirtyRows } from './processing-invalid.data';

const model: DataModel = [
  { name: 'month', type: 'categorical' },
  { name: 'revenue', type: 'continuous' },
];

/** Invalid values are skipped by default; invalid="error" turns the same data into a fail-loud check. */
const Demo: FC = () => (
  <Layout width={620} height={250} style={{ maxWidth: '100%', height: 'auto' }}>
    <Plot data={cleanRows} model={model} width={300} height={220} x={0} y={20}>
      <IntervalMark x="month" y="revenue" color="month" />
      <Axis dimension="x" />
      <Axis dimension="y" grid />
    </Plot>
    <Plot data={dirtyRows} model={model} width={300} height={220} x={320} y={20}>
      <IntervalMark x="month" y="revenue" color="month" />
      <Axis dimension="x" />
      <Axis dimension="y" grid />
    </Plot>
  </Layout>
);

export default Demo;
