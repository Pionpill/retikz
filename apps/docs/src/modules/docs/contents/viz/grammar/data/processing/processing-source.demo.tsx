import type { DataModel } from '@retikz/plot';
import type { FC } from 'react';

import { Axis, PathMark, Plot, PointMark } from '@retikz/plot-react';
import { Layout } from '@retikz/react';

import { financeFeed, sales } from './processing-source.data';

const model: DataModel = [
  { name: 'month', type: 'temporal' },
  { name: 'revenue', type: 'continuous' },
];

/** The same logical model can bind to either matching fields or renamed fields. */
const Demo: FC = () => (
  <Layout width={620} height={250} style={{ maxWidth: '100%', height: 'auto' }}>
    <Plot
      data={financeFeed}
      model={model}
      fieldMap={{ month: 'period', revenue: 'amount' }}
      width={300}
      height={220}
      x={320}
      y={20}
    >
      <PathMark x="month" y="revenue" order="month" />
      <PointMark x="month" y="revenue" />
      <Axis dimension="x" />
      <Axis dimension="y" grid />
    </Plot>
    <Plot data={sales} model={model} width={300} height={220} x={0} y={20}>
      <PathMark x="month" y="revenue" order="month" />
      <PointMark x="month" y="revenue" />
      <Axis dimension="x" />
      <Axis dimension="y" grid />
    </Plot>
  </Layout>
);

export default Demo;
