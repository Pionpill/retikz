import { Layout, Scope } from '@retikz/react';
import type { FC } from 'react';

import { circuitMeter, Meter } from './circuit-01-meters.meter';
import { Battery, circuitShapes, Rheostat, Switch } from './circuit-shapes';

const INK = 'currentColor';
const FONT = { family: 'Arial, sans-serif' } as const;

const CircuitDemo: FC = () => (
  <Layout extensions={{ shapes: [...circuitShapes, circuitMeter] }}>
    <Scope
      defaults={{
        path: {
          style: { stroke: INK, strokeWidth: 1.5, lineCap: 'round', lineJoin: 'round' },
        },
        node: {
          style: { font: FONT, stroke: 'none' },
          layout: { padding: 0 },
        },
        label: { font: { ...FONT, size: 14 } },
      }}
    >
      <Switch id="switch" position={[175, 100]} />
      <Meter id="ammeter" position={[312.5, 100]} text="A" />
      <Battery id="battery" position={[80, 160]} rotate={90} />
      <Rheostat id="rheostat" position={[230, 220]} />
    </Scope>
  </Layout>
);

export default CircuitDemo;
