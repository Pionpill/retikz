import type { FC } from 'react';

import { Layout, Node, Ribbon, Step } from '@retikz/react';

const Demo: FC = () => (
  <Layout
    width={560}
    height={220}
    viewBox={{ x: -280, y: -110, width: 560, height: 220 }}
    color="#172033"
  >
    <Ribbon
      width={{
        kind: 'stops',
        stops: [
          { offset: 0, value: 46 },
          { offset: 0.5, value: 12 },
          { offset: 1, value: 42 },
        ],
        interpolation: 'smooth',
      }}
      fill="#80ed99"
      fillOpacity={0.78}
      stroke="#14532d"
      strokeWidth={1.2}
      drawOpacity={0.22}
      samples={72}
    >
      <Step kind="move" to={[-212, -48]} />
      <Step kind="curve" control={[0, -76]} to={[212, 48]} />
    </Ribbon>

    <Node
      position={[0, 72]}
      fill="none"
      stroke="none"
      textColor="#5f6c7b"
      font={{ size: 13, weight: 'bold' }}
    >
      wide - narrow - wide
    </Node>
  </Layout>
);

export default Demo;
