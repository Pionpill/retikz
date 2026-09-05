import type { FC } from 'react';

import { Layout, Scope } from '@retikz/react';

import { circuitMeter, Meter } from './circuit-01-meters.meter';
import { Battery, circuitShapes, Rheostat, Switch } from './circuit-shapes';

const INK = 'currentColor';
const FONT = { family: 'Arial, sans-serif' } as const;

const CircuitDemo: FC = () => (
  <Layout
    width={600}
    height={300}
    viewBox={{ x: 0, y: 0, width: 1280, height: 760 }}
    shapes={[...circuitShapes, circuitMeter]}
  >
    <Scope
      defaults={{
        path: {
          style: { stroke: INK, strokeWidth: 3, lineCap: 'round', lineJoin: 'round' },
        },
        node: {
          style: { font: FONT, stroke: 'none' },
          layout: { padding: 0 },
        },
        label: { font: { ...FONT, size: 16 } },
      }}
    >
      <Switch id="switch" position={[350, 200]} />
      <Meter id="ammeter" position={[625, 200]} text="A" />
      <Battery id="battery" position={[160, 320]} rotate={90} />
      <Rheostat id="rheostat" position={[460, 440]} />
    </Scope>
  </Layout>
);

export default CircuitDemo;
