import type { DataModel } from '@retikz/plot';
import type { FC } from 'react';

import { Axis, PathMark, Plot, PointMark } from '@retikz/plot-react';
import { Layout } from '@retikz/react';

import { canonicalRows, mixedRows } from './processing-storage.data';

const model: DataModel = [
  { name: 'month', type: 'temporal' },
  { name: 'revenue', type: 'continuous' },
];

/** Date / epoch millis / ISO and numeric strings all normalize under the same declared types. */
const Demo: FC = () => (
  <Layout width={620} height={250} style={{ maxWidth: '100%', height: 'auto' }}>
    <Plot data={canonicalRows} model={model} width={300} height={220} x={0} y={20}>
      <PathMark x="month" y="revenue" order="month" />
      <PointMark x="month" y="revenue" />
      <Axis dimension="x" />
      <Axis dimension="y" grid />
    </Plot>
    <Plot data={mixedRows} model={model} width={300} height={220} x={320} y={20}>
      <PathMark x="month" y="revenue" order="month" />
      <PointMark x="month" y="revenue" />
      <Axis dimension="x" />
      <Axis dimension="y" grid />
    </Plot>
  </Layout>
);

export default Demo;
