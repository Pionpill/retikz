import { Layout, Scope } from '@retikz/react';
import type { FC } from 'react';

import { Battery, Resistor, Rheostat, Switch, circuitShapes } from './circuit-shapes';

const FONT = { family: 'Arial, sans-serif' } as const;

const CircuitDemo: FC = () => (
  <Layout width={600} height={300} viewBox={{ x: 0, y: 0, width: 1280, height: 760 }} shapes={circuitShapes}>
    <Scope nodeDefault={{ font: FONT, stroke: 'none', padding: 0 }}>
      <Battery position={[280, 360]} />
      <Switch position={[520, 360]} />
      <Resistor position={[760, 360]} />
      <Rheostat position={[1000, 360]} />
    </Scope>
  </Layout>
);

export default CircuitDemo;
