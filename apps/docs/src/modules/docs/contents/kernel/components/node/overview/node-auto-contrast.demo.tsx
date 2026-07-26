import type { FC } from 'react';

import { NodeTextColor } from '@retikz/core';
import { Layout, Node, Scope } from '@retikz/react';

const Demo: FC = () => (
  <Layout width={520} height={150} viewBox={{ x: -260, y: -75, width: 520, height: 150 }}>
    <Scope
      nodeDefault={{
        textColor: NodeTextColor.Contrast,
        minimumSize: { width: 104, height: 56 },
        padding: 12,
        stroke: '#64748b',
      }}
    >
      <Node position={[-195, 0]} fill="#f8fafc">
        Light
      </Node>
      <Node position={[-65, 0]} fill="#1e293b">
        Dark
      </Node>
      <Node position={[65, 0]} fill="#f59e0b">
        Accent
      </Node>
      <Node position={[195, 0]} fill="#2563eb">
        Brand
      </Node>
    </Scope>
  </Layout>
);

export default Demo;
