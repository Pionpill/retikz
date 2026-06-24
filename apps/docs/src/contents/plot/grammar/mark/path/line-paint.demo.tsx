import type { FC } from 'react';
import type { IRPaintSpec } from '@retikz/plot';
import { Axis, PathMark, Plot } from '@retikz/plot-react';
import { Layout } from '@retikz/react';

import { revenue } from './line-basic.data';

const strokePaint: IRPaintSpec = {
  kind: 'linearGradient',
  angle: 0,
  stops: [
    { offset: 0, color: '#38bdf8' },
    { offset: 0.55, color: '#22c55e' },
    { offset: 1, color: '#f97316' },
  ],
};

const Demo: FC = () => (
  <Layout width={620} height={260} style={{ maxWidth: '100%', height: 'auto' }}>
    <Plot data={revenue} width={560} height={220} x={30} y={20}>
      <PathMark x="month" y="revenue" order="month" stroke={strokePaint} strokeWidth={5} lineCap="round" lineJoin="round" />
      <Axis dimension="x" />
      <Axis dimension="y" grid />
    </Plot>
  </Layout>
);

export default Demo;
