import type { FC } from 'react';

import { Layout, Scope } from '@retikz/react';

import { Battery, circuitShapes, Resistor, Rheostat, Switch } from './circuit-shapes';

const FONT = { family: 'Arial, sans-serif' } as const;

const CircuitDemo: FC = () => (
  <Layout shapes={circuitShapes}>
    <Scope
      defaults={{
        node: {
          style: { font: FONT, stroke: 'none' },
          layout: { padding: 0 },
        },
      }}
    >
      <Battery position={[280, 360]} />
      <Switch position={[520, 360]} />
      <Resistor position={[760, 360]} />
      <Rheostat position={[1000, 360]} />
    </Scope>
  </Layout>
);

export default CircuitDemo;
