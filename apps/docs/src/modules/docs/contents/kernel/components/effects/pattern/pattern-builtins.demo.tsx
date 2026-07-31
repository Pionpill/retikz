import type { FC } from 'react';

import { Layout, Node } from '@retikz/react';

/** 在同一固定场景中展示全部三种内置图案 */
const Demo: FC = () => (
  <Layout width={360} height={140} viewBox={{ x: -180, y: -70, width: 360, height: 140 }}>
    <Node
      position={[-115, 0]}
      shape="rectangle"
      minimumSize={{ width: 92, height: 82 }}
      fill={{
        kind: 'pattern',
        shape: 'lines',
        color: '#2563eb',
        background: '#eff6ff',
        size: 10,
        dashed: true,
      }}
      stroke="#2563eb"
    >
      lines
    </Node>
    <Node
      position={[0, 0]}
      shape="rectangle"
      minimumSize={{ width: 92, height: 82 }}
      fill={{ kind: 'pattern', shape: 'dots', color: '#c2410c', background: '#fff7ed', size: 12 }}
      stroke="#c2410c"
    >
      dots
    </Node>
    <Node
      position={[115, 0]}
      shape="rectangle"
      minimumSize={{ width: 92, height: 82 }}
      fill={{
        kind: 'pattern',
        shape: 'grid',
        color: '#15803d',
        background: '#f0fdf4',
        size: 14,
        dotted: true,
        lineCap: 'round',
      }}
      stroke="#15803d"
    >
      grid
    </Node>
  </Layout>
);

export default Demo;
