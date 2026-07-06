import type { DataModel } from '@retikz/data';
import type { FC } from 'react';

import { Axis, PathMark, Plot, PointMark } from '@retikz/plot-react';
import { Layout } from '@retikz/react';

import { currentSales, forecastSales } from './processing-same.data';

const model: DataModel = [
  { name: 'month', type: 'temporal' },
  { name: 'revenue', type: 'continuous' },
];

/** Swapping data is enough when both sources keep the same field contract. */
const Demo: FC = () => (
  <Layout width={620} height={250} style={{ maxWidth: '100%', height: 'auto' }}>
    <Plot data={currentSales} model={model} width={300} height={220} x={0} y={20}>
      <PathMark x="month" y="revenue" order="month" />
      <PointMark x="month" y="revenue" />
      <Axis dimension="x" />
      <Axis dimension="y" grid />
    </Plot>
    <Plot data={forecastSales} model={model} width={300} height={220} x={320} y={20}>
      <PathMark x="month" y="revenue" order="month" />
      <PointMark x="month" y="revenue" />
      <Axis dimension="x" />
      <Axis dimension="y" grid />
    </Plot>
  </Layout>
);

export default Demo;
