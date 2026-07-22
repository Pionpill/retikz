import type { FC } from 'react';

import { Axis, PathMark, Plot, PointMark } from '@retikz/plot-react';
import { Layout } from '@retikz/react';

import { defaultRows, reportRows } from './processing-format.data';

/** Built-in coercion handles ISO / numbers; declarative format handles slash dates / percent strings. */
const Demo: FC = () => (
  <Layout width={620} height={250} style={{ maxWidth: '100%', height: 'auto' }}>
    <Plot
      data={defaultRows}
      model={[
        { name: 'date', type: 'temporal' },
        { name: 'retention', type: 'continuous' },
      ]}
      width={300}
      height={220}
      x={0}
      y={20}
    >
      <PathMark x="date" y="retention" order="date" />
      <PointMark x="date" y="retention" />
      <Axis dimension="x" />
      <Axis dimension="y" grid />
    </Plot>
    <Plot
      data={reportRows}
      model={[
        { name: 'date', format: 'slashDate' },
        { name: 'retention', format: 'percent' },
      ]}
      width={300}
      height={220}
      x={320}
      y={20}
    >
      <PathMark x="date" y="retention" order="date" />
      <PointMark x="date" y="retention" />
      <Axis dimension="x" />
      <Axis dimension="y" grid />
    </Plot>
  </Layout>
);

export default Demo;
