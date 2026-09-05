import type { FC } from 'react';

import { Layout, Node } from '@retikz/react';

/** 在同一固定场景中展示全部三种内置图案 */
const Demo: FC = () => (
  <Layout>
    <Node
      position={[-115, 0]}
      shape="rectangle"
      style={{
        fill: {
          kind: 'pattern',
          shape: 'lines',
          color: '#2563eb',
          background: '#eff6ff',
          size: 10,
          dashed: true,
        },
        stroke: '#2563eb',
      }}
      layout={{ minimumSize: { width: 92, height: 82 } }}
    >
      lines
    </Node>
    <Node
      position={[0, 0]}
      shape="rectangle"
      style={{
        fill: { kind: 'pattern', shape: 'dots', color: '#c2410c', background: '#fff7ed', size: 12 },
        stroke: '#c2410c',
      }}
      layout={{ minimumSize: { width: 92, height: 82 } }}
    >
      dots
    </Node>
    <Node
      position={[115, 0]}
      shape="rectangle"
      style={{
        fill: {
          kind: 'pattern',
          shape: 'grid',
          color: '#15803d',
          background: '#f0fdf4',
          size: 14,
          dotted: true,
          lineCap: 'round',
        },
        stroke: '#15803d',
      }}
      layout={{ minimumSize: { width: 92, height: 82 } }}
    >
      grid
    </Node>
  </Layout>
);

export default Demo;
