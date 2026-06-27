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
      start={{ width: 28, direction: 0 }}
      end={{ width: 46, direction: 0 }}
      interpolation="smooth"
      fill="#f9c74f"
      fillOpacity={0.82}
      stroke="#9b4d00"
      strokeWidth={1.2}
      drawOpacity={0.28}
      samples={80}
    >
      <Step kind="move" to={[-220, -54]} />
      <Step kind="line" to={[-96, -54]} />
      <Step kind="cubic" control1={[-8, -54]} control2={[8, 50]} to={[96, 50]} />
      <Step kind="line" to={[220, 50]} />
    </Ribbon>

    <Node
      position={[-158, -88]}
      fill="none"
      stroke="none"
      textColor="#5f6c7b"
      font={{ size: 13, weight: 'bold' }}
    >
      line
    </Node>
    <Node
      position={[0, 82]}
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
