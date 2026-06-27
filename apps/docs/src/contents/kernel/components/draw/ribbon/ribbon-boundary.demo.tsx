import type { FC } from 'react';

import { Layout, Ribbon, Step } from '@retikz/react';

const Demo: FC = () => (
  <Layout
    width={560}
    height={240}
    viewBox={{ x: -280, y: -120, width: 560, height: 240 }}
    color="#172033"
  >
    <Ribbon
      kind="boundary"
      fill={{
        kind: 'linearGradient',
        angle: 0,
        stops: [
          { offset: 0, color: '#a78bfa' },
          { offset: 1, color: '#22d3ee' },
        ],
      }}
      fillOpacity={0.74}
      stroke="#172033"
      strokeWidth={1}
      drawOpacity={0.18}
      sampling={{ kind: 'fixed', samples: 80 }}
    >
      <Ribbon.Upper>
        <Step kind="move" to={[-220, -64]} />
        <Step kind="cubic" control1={[-80, -96]} control2={[92, -36]} to={[220, -28]} />
      </Ribbon.Upper>
      <Ribbon.Lower>
        <Step kind="move" to={[-220, -18]} />
        <Step kind="cubic" control1={[-60, 16]} control2={[92, 74]} to={[220, 66]} />
      </Ribbon.Lower>
    </Ribbon>
  </Layout>
);

export default Demo;
