import type { FC } from 'react';

import { Draw, Layout, Node, Scope } from '@retikz/react';

import { circuitMeter, Meter } from './circuit-01-meters.meter';
import { at, Battery, circuitShapes, Resistor, Rheostat, Switch } from './circuit-shapes';

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
      pathDefault={{ stroke: INK, strokeWidth: 3, lineCap: 'round', lineJoin: 'round' }}
      nodeDefault={{ font: FONT, stroke: 'none', padding: 0 }}
      labelDefault={{ font: { ...FONT, size: 28, style: 'italic' } }}
    >
      <Switch id="switch" position={[350, 200]} label={{ text: 'S', position: 'above' }} />
      <Meter id="ammeter" position={[625, 200]} text="A" />
      <Battery id="battery" position={[160, 320]} rotate={90} />
      <Rheostat
        id="rheostat"
        position={[460, 440]}
        label={{ text: '滑动变阻器', position: 'above', distance: 30, font: { ...FONT, size: 28, style: 'normal' } }}
      />

      {/* 测量单元：电阻 + 正下方电压表，两端折线相连，整组一个 Scope；R / U 标注用 Node 自带 label */}
      <Scope>
        <Resistor id="cell1-resistor" position={[900, 200]} label={{ text: 'R1', position: 'above' }} />
        <Meter
          id="cell1-voltmeter"
          position={[900, 320]}
          text="V"
          label={{ text: 'U1', position: 'above', distance: 20 }}
        />
        <Draw way={[at('cell1-resistor', 'left'), [809, 320], at('cell1-voltmeter', 'left')]} />
        <Draw way={[at('cell1-resistor', 'right'), [991, 320], at('cell1-voltmeter', 'right')]} />
      </Scope>

      {/* 第二组靠 Scope 平移复制（左移 60、下移 240），只换 id 前缀与标注 */}
      <Scope transforms={[{ kind: 'translate', x: -60, y: 240 }]}>
        <Resistor id="cell2-resistor" position={[900, 200]} label={{ text: 'R2', position: 'above' }} />
        <Meter
          id="cell2-voltmeter"
          position={[900, 320]}
          text="V"
          label={{ text: 'U2', position: 'above', distance: 20 }}
        />
        <Draw way={[at('cell2-resistor', 'left'), [809, 320], at('cell2-voltmeter', 'left')]} />
        <Draw way={[at('cell2-resistor', 'right'), [991, 320], at('cell2-voltmeter', 'right')]} />
      </Scope>

      {/* 主回路：用折角把元件依次连成一个闭合回路 */}
      <Draw way={[at('battery', 'left'), [160, 200], at('switch', 'left')]} />
      <Draw way={[at('switch', 'right'), at('ammeter', 'left')]} />
      <Draw way={[at('ammeter', 'right'), at('cell1-resistor', 'left')]} />
      <Draw way={[at('cell1-resistor', 'right'), [1040, 200], [1040, 440], at('cell2-resistor', 'right')]} />
      <Draw way={[at('cell2-resistor', 'left'), at('rheostat', 'right')]} />
      <Draw way={[at('rheostat', 'left'), [160, 440], at('battery', 'right')]} />

      {/* 电源竖放，Node 的 label 会跟着旋转，所以 E 用一个相对定位的斜体文字 Node */}
      <Node position={{ direction: 'left', of: 'battery', distance: 72 }} font={{ ...FONT, size: 28, style: 'italic' }}>
        E
      </Node>
    </Scope>
  </Layout>
);

export default CircuitDemo;
