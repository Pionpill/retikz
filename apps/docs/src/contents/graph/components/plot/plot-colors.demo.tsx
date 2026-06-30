import type { FC } from 'react';

import { Axis, IntervalMark, Plot } from '@retikz/plot-react';
import { Layout } from '@retikz/react';
import { schemeTableau10 } from 'd3-scale-chromatic';

import { revenue } from './plot-cartesian.data';

const Demo: FC = () => (
  <Layout width={620} height={250} style={{ maxWidth: '100%', height: 'auto' }}>
    <Plot data={revenue} width={300} height={220} x={0} y={20}>
      <IntervalMark x="quarter" y="value" color="quarter" />
      <Axis dimension="x" />
      <Axis dimension="y" grid />
    </Plot>
    <Plot data={revenue} width={300} height={220} colors={[...schemeTableau10]} x={320} y={20}>
      <IntervalMark x="quarter" y="value" color="quarter" />
      <Axis dimension="x" />
      <Axis dimension="y" grid />
    </Plot>
  </Layout>
);

export default Demo;
