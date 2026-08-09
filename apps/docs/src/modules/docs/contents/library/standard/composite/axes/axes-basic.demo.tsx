import type { FC } from 'react';

import { Layout } from '@retikz/react';
import { Axes } from '@retikz/standard-react';

const Demo: FC = () => (
  <Layout width={280} height={170} style={{ maxWidth: '100%', height: 'auto' }}>
    <Axes
      origin={{ position: [140, 90], label: { text: '0', style: { font: { size: 10 }, textColor: 'gray' } } }}
      x={{
        extent: { negative: 110, positive: 110 },
        grid: { spacing: 20, style: { stroke: 'lightgray', strokeWidth: 1 } },
        line: { style: { stroke: 'currentColor', strokeWidth: 1.5 } },
        ticks: {
          source: { kind: 'spacing', spacing: 20 },
          style: { stroke: 'currentColor' },
          labels: {
            entries: [
              { value: -80, text: '−4' },
              { value: -40, text: '−2' },
              { value: 40, text: '2' },
              { value: 80, text: '4' },
            ],
            style: { font: { size: 10 }, textColor: 'gray' },
          },
        },
      }}
      y={{
        extent: { negative: 50, positive: 60 },
        grid: { spacing: 20, style: { stroke: 'lightgray', strokeWidth: 1 } },
        line: { style: { stroke: 'currentColor', strokeWidth: 1.5 } },
        ticks: {
          source: { kind: 'spacing', spacing: 20, extent: 'positive' },
          style: { stroke: 'currentColor' },
          labels: {
            entries: [
              { value: 20, text: '1' },
              { value: 40, text: '2' },
            ],
            style: { font: { size: 10 }, textColor: 'gray' },
          },
        },
      }}
    />
  </Layout>
);

export default Demo;
