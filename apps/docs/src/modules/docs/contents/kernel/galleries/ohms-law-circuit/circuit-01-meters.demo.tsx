import type { FC } from 'react';

import { Layout, Scope } from '@retikz/react';

import { circuitMeter, Meter } from './circuit-01-meters.meter';

const FONT = { family: 'Arial, sans-serif' } as const;

const CircuitDemo: FC = () => (
  <Layout shapes={[circuitMeter]}>
    <Scope
      defaults={{
        node: {
          style: { font: FONT, stroke: 'none' },
          layout: { padding: 0 },
        },
      }}
    >
      <Meter position={[520, 360]} text="A" />
      <Meter position={[760, 360]} text="V" />
    </Scope>
  </Layout>
);

export default CircuitDemo;
