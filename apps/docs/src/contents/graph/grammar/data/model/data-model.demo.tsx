import type { FC } from 'react';

import { Axis, IntervalMark, PathMark, Plot, PointMark } from '@retikz/plot-react';
import { Layout } from '@retikz/react';

import { acquisition, sales, segments } from './data-model.data';

/** Three field types drive three scale defaults: linear, time, and band. */
const Demo: FC = () => (
  <Layout width={620} height={610} style={{ maxWidth: '100%', height: 'auto' }}>
    <Plot
      data={acquisition}
      model={[
        { name: 'visits', type: 'continuous' },
        { name: 'conversion', type: 'continuous' },
      ]}
      width={600}
      height={180}
      x={10}
      y={0}
    >
      <PointMark x="visits" y="conversion" />
      <Axis dimension="x" />
      <Axis dimension="y" grid />
    </Plot>
    <Plot
      data={sales}
      model={[
        { name: 'month', type: 'temporal' },
        { name: 'revenue', type: 'continuous' },
      ]}
      width={600}
      height={180}
      x={10}
      y={205}
    >
      <PathMark x="month" y="revenue" order="month" />
      <Axis dimension="x" />
      <Axis dimension="y" grid />
    </Plot>
    <Plot
      data={segments}
      model={[
        { name: 'segment', type: 'categorical' },
        { name: 'revenue', type: 'continuous' },
      ]}
      width={600}
      height={180}
      x={10}
      y={410}
    >
      <IntervalMark x="segment" y="revenue" color="segment" />
      <Axis dimension="x" />
      <Axis dimension="y" grid />
    </Plot>
  </Layout>
);

export default Demo;
