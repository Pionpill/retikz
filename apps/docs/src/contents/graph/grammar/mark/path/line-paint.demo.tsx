import type { IRPaintSpec } from '@retikz/plot';
import type { FC } from 'react';

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

const fillPaint: IRPaintSpec = {
  kind: 'linearGradient',
  angle: 90,
  stops: [
    { offset: 0, color: 'rgba(14, 165, 233, 0.42)' },
    { offset: 0.62, color: 'rgba(34, 197, 94, 0.2)' },
    { offset: 1, color: 'rgba(34, 197, 94, 0)' },
  ],
};

const Demo: FC = () => (
  <Layout width={700} height={280} style={{ maxWidth: '100%', height: 'auto' }}>
    <Plot data={revenue} width={315} height={220} x={0} y={30}>
      <PathMark
        x="month"
        y="revenue"
        order="month"
        stroke={strokePaint}
        strokeWidth={5}
        lineCap="round"
        lineJoin="round"
      />
      <Axis dimension="x" />
      <Axis dimension="y" grid />
    </Plot>
    <Plot data={revenue} width={315} height={220} x={370} y={30}>
      <PathMark x="month" y="revenue" order="month" closure={{ kind: 'baseline' }} fill={fillPaint} stroke="none" />
      <PathMark
        x="month"
        y="revenue"
        order="month"
        stroke="#0284c7"
        strokeWidth={2.5}
        lineCap="round"
        lineJoin="round"
      />
      <Axis dimension="x" />
      <Axis dimension="y" grid />
    </Plot>
  </Layout>
);

export default Demo;
