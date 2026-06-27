import { Layout, Scope } from '@retikz/react';
import type { FC } from 'react';

import { Battery, Rheostat, Switch, circuitShapes } from './circuit-shapes';
import { Meter, circuitMeter } from './circuit-01-meters.meter';

const INK = 'currentColor';
const FONT = { family: 'Arial, sans-serif' } as const;

const CircuitDemo: FC = () => (
  <Layout
    width={600}
    height={300}
    viewBox={{ x: 0, y: 0, width: 1280, height: 760 }}
    shapes={{ ...circuitShapes, 'circuit-meter': circuitMeter }}
  >
    <Scope
      pathDefault={{ stroke: INK, strokeWidth: 3, lineCap: 'round', lineJoin: 'round' }}
      nodeDefault={{ font: FONT, stroke: 'none', padding: 0 }}
      labelDefault={{ font: { ...FONT, size: 16 } }}
    >
      <Switch id="switch" position={[350, 200]} />
      <Meter id="ammeter" position={[625, 200]} text="A" />
      <Battery id="battery" position={[160, 320]} rotate={90} />
      <Rheostat id="rheostat" position={[460, 440]} />
    </Scope>
  </Layout>
);

export default CircuitDemo;
