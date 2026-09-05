import type { FC } from 'react';

import { Layout, Node, Scope } from '@retikz/react';

const Demo: FC = () => (
  <Layout width={460} height={130} viewBox={{ x: -230, y: -65, width: 460, height: 130 }}>
    <Scope
      defaults={{
        node: {
          style: { stroke: 1, fill: 0.08, textColor: 'currentColor' },
          layout: { minimumSize: { width: 112, height: 52 }, padding: 10 },
        },
      }}
    >
      <Node position={[-145, 0]} style={{ color: '#2563eb' }}>
        Primary
      </Node>
      <Node position={[0, 0]} style={{ color: 'darkorange' }}>
        Accent
      </Node>
      <Node position={[145, 0]} style={{ color: '#16a34a' }}>
        Success
      </Node>
    </Scope>
  </Layout>
);

export default Demo;
