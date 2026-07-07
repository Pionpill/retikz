import type { FC } from 'react';

import { Axis, IntervalMark, Plot } from '@retikz/plot-react';
import { Layout } from '@retikz/react';

import { sizeSales } from './data-model-order.data';

/** Left: data appearance order. Right: explicit business order on the categorical field. */
const Demo: FC = () => (
  <Layout width={620} height={250} style={{ maxWidth: '100%', height: 'auto' }}>
    <Plot data={sizeSales} width={300} height={220} x={0} y={20}>
      <IntervalMark x="size" y="value" color="size" />
      <Axis dimension="x" />
      <Axis dimension="y" grid />
    </Plot>
    <Plot
      data={sizeSales}
      model={[
        { name: 'size', type: 'categorical', order: ['S', 'M', 'L', 'XL'] },
        { name: 'value', type: 'continuous' },
      ]}
      width={300}
      height={220}
      x={320}
      y={20}
    >
      <IntervalMark x="size" y="value" color="size" />
      <Axis dimension="x" />
      <Axis dimension="y" grid />
    </Plot>
  </Layout>
);

export default Demo;
