import type { FC } from 'react';

import { Layout, Node } from '@retikz/react';

const Demo: FC = () => (
  <Layout width={560} height={260}>
    <Node
      id="outside"
      position={[-150, 0]}
      minimumSize={{ width: 110, height: 68 }}
      label={[
        { text: '外侧', position: 'top', distance: 14 },
        { text: '0°', position: 0, distance: 14 },
      ]}
    >
      outside
    </Node>
    <Node
      id="inside"
      position={[90, 0]}
      minimumSize={{ width: 160, height: 90 }}
      label={[
        {
          text: 'top 25%',
          position: { boundary: 'top', fraction: 0.25 },
          placement: 'inside',
          distance: 10,
        },
        {
          text: 'right',
          position: { boundary: 'right' },
          placement: 'inside',
          distance: 12,
        },
        {
          text: 'bottom 80%',
          position: { boundary: 'bottom', fraction: 0.8 },
          placement: 'inside',
          distance: 10,
        },
      ]}
    >
      inside
    </Node>
  </Layout>
);

export default Demo;
