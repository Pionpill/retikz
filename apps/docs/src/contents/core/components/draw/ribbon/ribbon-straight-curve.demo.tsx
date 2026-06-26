import type { FC } from 'react';

import { Layout, Node, Ribbon, Step } from '@retikz/react';

const Demo: FC = () => (
  <Layout
    width={560}
    height={240}
    viewBox={{ x: -280, y: -120, width: 560, height: 240 }}
    color="#172033"
  >
    <Ribbon
      width={{ start: 28, end: 46, interpolation: 'smooth' }}
      startDirection={0}
      endDirection={18}
      fill="#f9c74f"
      fillOpacity={0.82}
      stroke="#9b4d00"
      strokeWidth={1.2}
      drawOpacity={0.28}
      samples={80}
    >
      <Step kind="move" to={[-220, -54]} />
      <Step kind="line" to={[-64, -54]} />
      <Step kind="curve" control={[80, -54]} to={[220, 50]} />
    </Ribbon>

    <Node
      position={[-142, -88]}
      fill="none"
      stroke="none"
      textColor="#5f6c7b"
      font={{ size: 13, weight: 'bold' }}
    >
      line
    </Node>
    <Node
      position={[104, 82]}
      fill="none"
      stroke="none"
      textColor="#5f6c7b"
      font={{ size: 13, weight: 'bold' }}
    >
      curve
    </Node>
  </Layout>
);

export default Demo;
