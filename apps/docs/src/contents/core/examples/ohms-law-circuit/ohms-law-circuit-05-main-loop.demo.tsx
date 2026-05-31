import { Draw, Layout, Scope } from '@retikz/react';
import type { FC } from 'react';

import { Battery, Resistor, Rheostat, Switch, at, circuitShapes } from './circuitShapes';
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

      {/* 测量单元：一段电阻 + 正下方电压表，两端各用折线竖直相连，整组收进一个 Scope */}
      <Scope>
        <Resistor id="cell1-resistor" position={[900, 200]} />
        <Meter id="cell1-voltmeter" position={[900, 320]} text="V" />
        <Draw way={[at('cell1-resistor', 'west'), [809, 320], at('cell1-voltmeter', 'west')]} />
        <Draw way={[at('cell1-resistor', 'east'), [991, 320], at('cell1-voltmeter', 'east')]} />
      </Scope>

      {/* 第二组不重写，靠 Scope 平移复制（左移 60、下移 240），只换 id 前缀 */}
      <Scope transforms={[{ kind: 'translate', x: -60, y: 240 }]}>
        <Resistor id="cell2-resistor" position={[900, 200]} />
        <Meter id="cell2-voltmeter" position={[900, 320]} text="V" />
        <Draw way={[at('cell2-resistor', 'west'), [809, 320], at('cell2-voltmeter', 'west')]} />
        <Draw way={[at('cell2-resistor', 'east'), [991, 320], at('cell2-voltmeter', 'east')]} />
      </Scope>

      {/* 主回路：用折角把元件依次连成一个闭合回路 */}
      <Draw way={[at('battery', 'west'), [160, 200], at('switch', 'west')]} />
      <Draw way={[at('switch', 'east'), at('ammeter', 'west')]} />
      <Draw way={[at('ammeter', 'east'), at('cell1-resistor', 'west')]} />
      <Draw way={[at('cell1-resistor', 'east'), [1040, 200], [1040, 440], at('cell2-resistor', 'east')]} />
      <Draw way={[at('cell2-resistor', 'west'), at('rheostat', 'east')]} />
      <Draw way={[at('rheostat', 'west'), [160, 440], at('battery', 'east')]} />
    </Scope>
  </Layout>
);

export default CircuitDemo;
