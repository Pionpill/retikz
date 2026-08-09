import type { FC } from 'react';

import { Layout, Node } from '@retikz/react';
import { Axes } from '@retikz/standard-react';

/** Axes 常见语义变体的中文并列对比 */
const Demo: FC = () => (
  <Layout width={760} height={145} style={{ maxWidth: '100%', height: 'auto' }}>
    <Node position={[95, 18]} stroke="none" fill="none" padding={0} font={{ size: 12 }}>
      仅正半轴
    </Node>
    <Axes
      origin={{ position: [38, 118] }}
      x={{
        extent: { negative: 0, positive: 120 },
        ticks: { source: { kind: 'spacing', spacing: 30, extent: 'positive' } },
        label: false,
      }}
      y={{
        extent: { negative: 0, positive: 70 },
        ticks: { source: { kind: 'spacing', spacing: 20, extent: 'positive' } },
        label: false,
      }}
    />

    <Node position={[285, 18]} stroke="none" fill="none" padding={0} font={{ size: 12 }}>
      双向数轴
    </Node>
    <Axes
      origin={{ position: [285, 82], label: '0' }}
      x={{
        extent: 72,
        line: { arrows: 'both' },
        ticks: { source: { kind: 'values', values: [-40, 40] }, side: 'positive' },
        label: 't',
      }}
      y={{ extent: 20, line: false, ticks: false, grid: false, label: false }}
    />

    <Node position={[475, 18]} stroke="none" fill="none" padding={0} font={{ size: 12 }}>
      非对称范围
    </Node>
    <Axes
      origin={{ position: [465, 78] }}
      x={{
        extent: { negative: 55, positive: 75 },
        grid: { spacing: 20, style: { stroke: 'lightgray' } },
        label: false,
      }}
      y={{
        extent: { negative: 30, positive: 55 },
        grid: { spacing: 20, style: { stroke: 'lightgray' } },
        label: false,
      }}
    />

    <Node position={[665, 18]} stroke="none" fill="none" padding={0} font={{ size: 12 }}>
      只保留刻度
    </Node>
    <Axes
      origin={{ position: [665, 82] }}
      x={{
        extent: 72,
        line: false,
        ticks: {
          source: { kind: 'values', values: [-60, -40, -20, 20, 40, 60] },
          labels: {
            entries: [
              { value: -60, text: '−3' },
              { value: -40, text: '−2' },
              { value: -20, text: '−1' },
              { value: 20, text: '1' },
              { value: 40, text: '2' },
              { value: 60, text: '3' },
            ],
          },
        },
        label: false,
      }}
      y={{ extent: 20, line: false, ticks: false, grid: false, label: false }}
    />
  </Layout>
);

export default Demo;
