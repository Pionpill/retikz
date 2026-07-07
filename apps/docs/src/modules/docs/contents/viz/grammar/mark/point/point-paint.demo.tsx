import type { IRPaintSpec } from '@retikz/core';
import type { FC } from 'react';

import { Axis, Plot, PointMark } from '@retikz/plot-react';
import { Layout } from '@retikz/react';

import { points } from './point-api.data';

const fillPaint: IRPaintSpec = {
  kind: 'linearGradient',
  angle: 90,
  stops: [
    { offset: 0, color: '#38bdf8' },
    { offset: 1, color: '#0f172a' },
  ],
};

const strokePaint: IRPaintSpec = {
  kind: 'radialGradient',
  stops: [
    { offset: 0, color: '#fef3c7' },
    { offset: 1, color: '#f97316' },
  ],
};

const Demo: FC = () => (
  <Layout width={620} height={260} style={{ maxWidth: '100%', height: 'auto' }}>
    <Plot data={points} width={560} height={220} x={30} y={20}>
      <PointMark
        x="x"
        y="y"
        size="pop"
        shape="region"
        fill={fillPaint}
        stroke={strokePaint}
        strokeWidth={3}
        fillOpacity={0.9}
      />
      <Axis dimension="x" />
      <Axis dimension="y" grid />
    </Plot>
  </Layout>
);

export default Demo;
