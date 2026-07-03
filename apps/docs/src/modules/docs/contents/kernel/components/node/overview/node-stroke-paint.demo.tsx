import type { FC } from 'react';

import { Layout, Node } from '@retikz/react';

const Demo: FC = () => (
  <Layout width={420} height={180}>
    <Node
      id="card"
      position={[-90, 0]}
      minimumSize={{ width: 130, height: 78 }}
      cornerRadius={12}
      fill="white"
      stroke={{
        kind: 'linearGradient',
        angle: 0,
        stops: [
          { offset: 0, color: '#2563eb' },
          { offset: 1, color: '#e11d48' },
        ],
      }}
      strokeWidth={7}
    />
    <Node
      id="pill"
      position={[110, 0]}
      shape="circle"
      minimumSize={90}
      fill="#fff7ed"
      stroke={{
        kind: 'radialGradient',
        stops: [
          { offset: 0, color: '#f97316' },
          { offset: 1, color: '#7c3aed' },
        ],
      }}
      strokeWidth={6}
    />
  </Layout>
);

export default Demo;
