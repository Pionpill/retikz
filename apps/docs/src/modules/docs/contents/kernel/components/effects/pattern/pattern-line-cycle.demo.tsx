import type { FC } from 'react';

import { Layout, Node } from '@retikz/react';

/** 展示每 N 条主线与任意线型序列两种周期表达 */
const Demo: FC = () => (
  <Layout width={380} height={180} viewBox={{ x: -190, y: -90, width: 380, height: 180 }}>
    <Node
      position={[-95, 0]}
      shape="rectangle"
      minimumSize={{ width: 150, height: 120 }}
      fill={{
        kind: 'pattern',
        shape: 'lines',
        size: 8,
        color: '#2563eb',
        background: '#eff6ff',
        lineStyleCycle: {
          period: 5,
          overrides: [{ index: 0, style: { lineWidth: 3 } }],
        },
      }}
      stroke="#2563eb"
    />
    <Node
      position={[95, 0]}
      shape="rectangle"
      minimumSize={{ width: 150, height: 120 }}
      fill={{
        kind: 'pattern',
        shape: 'lines',
        size: 8,
        color: '#7c3aed',
        background: '#faf5ff',
        lineStyleCycle: {
          period: 3,
          overrides: [
            { index: 1, style: { dotted: true, lineCap: 'round' } },
            { index: 2, style: { dashed: true, color: '#c026d3' } },
          ],
        },
      }}
      stroke="#7c3aed"
    />
  </Layout>
);

export default Demo;
