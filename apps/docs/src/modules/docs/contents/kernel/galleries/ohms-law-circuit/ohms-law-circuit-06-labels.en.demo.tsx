import { Draw, Layout, Node, Scope } from '@retikz/react';
import type { FC } from 'react';

import { circuitMeter, Meter } from './circuit-01-meters.meter';
import { at, Battery, circuitShapes, Resistor, Rheostat, Switch } from './circuit-shapes';

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
        label: { font: { ...FONT, size: 14, style: 'italic' } },
      }}
    >
      <Switch id="switch" position={[175, 100]} label={{ text: 'S', position: 'top' }} />
      <Meter id="ammeter" position={[312.5, 100]} text="A" />
      <Battery id="battery" position={[80, 160]} rotate={90} />
      <Rheostat
        id="rheostat"
        position={[230, 220]}
        label={{ text: 'Rheostat', position: 'top', distance: 15, font: { ...FONT, size: 14, style: 'normal' } }}
      />

      {/* Measurement unit: a resistor with a voltmeter bottom, joined by elbow polylines, in one Scope; R / U use the Node's own label */}
      <Scope>
        <Resistor id="cell1-resistor" position={[450, 100]} label={{ text: 'R1', position: 'top' }} />
        <Meter
          id="cell1-voltmeter"
          position={[450, 160]}
          text="V"
          label={{ text: 'U1', position: 'top', distance: 10 }}
        />
        <Draw way={[at('cell1-resistor', 'left'), [404.5, 160], at('cell1-voltmeter', 'left')]} />
        <Draw way={[at('cell1-resistor', 'right'), [495.5, 160], at('cell1-voltmeter', 'right')]} />
      </Scope>

      {/* Second unit is duplicated by a Scope translate (left 60, down 240); only the id prefix and labels change */}
      <Scope transforms={[{ kind: 'translate', x: -30, y: 120 }]}>
        <Resistor id="cell2-resistor" position={[450, 100]} label={{ text: 'R2', position: 'top' }} />
        <Meter
          id="cell2-voltmeter"
          position={[450, 160]}
          text="V"
          label={{ text: 'U2', position: 'top', distance: 10 }}
        />
        <Draw way={[at('cell2-resistor', 'left'), [404.5, 160], at('cell2-voltmeter', 'left')]} />
        <Draw way={[at('cell2-resistor', 'right'), [495.5, 160], at('cell2-voltmeter', 'right')]} />
      </Scope>

      {/* Main loop: elbow wires join the elements into one closed circuit */}
      <Draw way={[at('battery', 'left'), [80, 100], at('switch', 'left')]} />
      <Draw way={[at('switch', 'right'), at('ammeter', 'left')]} />
      <Draw way={[at('ammeter', 'right'), at('cell1-resistor', 'left')]} />
      <Draw way={[at('cell1-resistor', 'right'), [520, 100], [520, 220], at('cell2-resistor', 'right')]} />
      <Draw way={[at('cell2-resistor', 'left'), at('rheostat', 'right')]} />
      <Draw way={[at('rheostat', 'left'), [80, 220], at('battery', 'right')]} />

      {/* The battery is rotated, and a Node's label rotates with it, so E is a separate relative-positioned italic text Node */}
      <Node
        position={{ direction: 'left', of: 'battery', distance: 36 }}
        style={{ font: { ...FONT, size: 14, style: 'italic' } }}
      >
        E
      </Node>
    </Scope>
  </Layout>
);

export default CircuitDemo;
