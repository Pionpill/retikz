import type { IRChild } from '@retikz/core';
import type { FC } from 'react';

import { Layout } from '@retikz/react';
import { LegendContentKind, LegendDirection } from '@retikz/standard';
import { Legend } from '@retikz/standard-react';

const label = (id: string, text: string): IRChild => ({ type: 'node', id, position: [0, 0], text, stroke: 'none' });

const temperatureRamp: IRChild = {
  type: 'node',
  id: 'temperature-ramp',
  position: [0, 0],
  text: '',
  minimumSize: { width: 160, height: 16 },
  padding: 0,
  stroke: 'lightgray',
  fill: {
    kind: 'linearGradient',
    angle: 0,
    stops: [
      { offset: 0, color: 'dodgerblue' },
      { offset: 0.5, color: 'gold' },
      { offset: 1, color: 'orangered' },
    ],
  },
};

/** 带归一化刻度的连续样本 */
const Demo: FC = () => (
  <Layout
    width={430}
    height={150}
    viewBox={{ x: -20, y: -20, width: 430, height: 150 }}
    style={{ maxWidth: '100%', height: 'auto' }}
  >
    <Legend
      title={label('temperature-title', 'Temperature')}
      padding={12}
      content={{
        kind: LegendContentKind.Ramp,
        direction: LegendDirection.Horizontal,
        sample: temperatureRamp,
        sampleGap: 8,
        ticks: [
          { key: 'low', offset: 0, label: label('low-label', 'Low') },
          { key: 'middle', offset: 0.5, label: label('middle-label', 'Mid') },
          { key: 'high', offset: 1, label: label('high-label', 'High') },
        ],
      }}
    />
  </Layout>
);

export default Demo;
