import { Layout, Scope } from '@retikz/react';
import type { FC } from 'react';

import { circuitMeter, Meter } from './circuit-01-meters.meter';

const FONT = { family: 'Arial, sans-serif' } as const;

const CircuitDemo: FC = () => (
  <Layout extensions={{ shapes: [circuitMeter] }}>
    <Scope
      defaults={{
        node: {
          style: { font: FONT, stroke: 'none' },
          layout: { padding: 0 },
        },
      }}
    >
      <Meter position={[260, 180]} text="A" />
      <Meter position={[380, 180]} text="V" />
    </Scope>
  </Layout>
);

export default CircuitDemo;
