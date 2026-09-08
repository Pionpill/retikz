import type { FC } from 'react';

import { NodeTextColor } from '@retikz/core';
import { Layout, Node, Scope } from '@retikz/react';

const Demo: FC = () => (
  <Layout>
    <Scope
      defaults={{
        node: {
          style: { textColor: NodeTextColor.Contrast, stroke: '#64748b' },
          layout: { minimumSize: { width: 104, height: 56 }, padding: 12 },
        },
      }}
    >
      <Node position={[-195, 0]} style={{ fill: '#f8fafc' }}>
        Light
      </Node>
      <Node position={[-65, 0]} style={{ fill: '#1e293b' }}>
        Dark
      </Node>
      <Node position={[65, 0]} style={{ fill: '#f59e0b' }}>
        Accent
      </Node>
      <Node position={[195, 0]} style={{ fill: '#2563eb' }}>
        Brand
      </Node>
    </Scope>
  </Layout>
);

export default Demo;
