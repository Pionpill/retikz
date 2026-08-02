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

/** 连续样本与归一化刻度 */
const Demo: FC = () => (
  <Layout
    width={430}
    height={150}
    viewBox={{ x: -20, y: -20, width: 430, height: 150 }}
    style={{ maxWidth: '100%', height: 'auto' }}
  >
    <Legend
      title={label('temperature-title', '温度')}
      padding={12}
      content={{
        kind: LegendContentKind.Ramp,
        direction: LegendDirection.Horizontal,
        sample: temperatureRamp,
        sampleGap: 8,
        ticks: [
          { key: 'low', offset: 0, label: label('low-label', '低') },
          { key: 'middle', offset: 0.5, label: label('middle-label', '中') },
          { key: 'high', offset: 1, label: label('high-label', '高') },
        ],
      }}
    />
  </Layout>
);

export default Demo;
