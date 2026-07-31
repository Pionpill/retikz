import type { FC } from 'react';

import { Layout, Node } from '@retikz/react';

/** 展示 grid 横纵方向可分别继承和覆盖线型 */
const Demo: FC = () => (
  <Layout width={300} height={170} viewBox={{ x: -150, y: -85, width: 300, height: 170 }}>
    <Node
      position={[0, 0]}
      shape="rectangle"
      minimumSize={{ width: 220, height: 120 }}
      fill={{
        kind: 'pattern',
        shape: 'grid',
        size: 16,
        color: '#334155',
        background: '#f8fafc',
        horizontalStyle: {
          color: '#2563eb',
          dashed: true,
        },
        verticalStyle: {
          color: '#dc2626',
          lineWidth: 2,
          dotted: true,
          lineCap: 'round',
        },
      }}
      stroke="#475569"
    />
  </Layout>
);

export default Demo;
