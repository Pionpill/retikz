import { Layout, Scope } from '@retikz/react';
import type { FC } from 'react';

import { Battery, circuitShapes, Resistor, Rheostat, Switch } from './circuit-shapes';

const FONT = { family: 'Arial, sans-serif' } as const;

const CircuitDemo: FC = () => (
  <Layout extensions={{ shapes: circuitShapes }}>
    <Scope
      defaults={{
        node: {
          style: { font: FONT, stroke: 'none' },
          layout: { padding: 0 },
        },
      }}
    >
      <Battery position={[140, 180]} />
      <Switch position={[260, 180]} />
      <Resistor position={[380, 180]} />
      <Rheostat position={[500, 180]} />
    </Scope>
  </Layout>
);

export default CircuitDemo;
