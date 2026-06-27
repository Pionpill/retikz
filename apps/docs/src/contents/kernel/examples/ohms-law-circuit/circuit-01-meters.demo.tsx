import { Layout, Scope } from '@retikz/react';
import type { FC } from 'react';

import { Meter, circuitMeter } from './circuit-01-meters.meter';

const FONT = { family: 'Arial, sans-serif' } as const;

const CircuitDemo: FC = () => (
  <Layout width={600} height={300} viewBox={{ x: 0, y: 0, width: 1280, height: 760 }} shapes={{ 'circuit-meter': circuitMeter }}>
    <Scope nodeDefault={{ font: FONT, stroke: 'none', padding: 0 }}>
      <Meter position={[520, 360]} text="A" />
      <Meter position={[760, 360]} text="V" />
    </Scope>
  </Layout>
);

export default CircuitDemo;
