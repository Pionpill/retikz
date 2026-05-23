import { Coordinate, Draw, Layout, Node } from '@retikz/react';
import type { FC } from 'react';

/**
 * Coordinate offset chain
 * @description ca → cb → cc three coordinates derived via `{ of, offset }`; nodes anchor to coordinates, so moving `ca` shifts the entire group.
 */
const Demo: FC = () => (
  <Layout width={420} height={180}>
    <Coordinate id="ca" position={[-140, 0]} />
    <Coordinate id="cb" position={{ of: 'ca', offset: [120, 0] }} />
    <Coordinate id="cc" position={{ of: 'cb', offset: [120, 0] }} />
    <Node id="A" position={{ of: 'ca', offset: [0, 0] }}>a</Node>
    <Node id="B" position={{ of: 'cb', offset: [0, 30] }}>b</Node>
    <Node id="C" position={{ of: 'cc', offset: [0, -30] }}>c</Node>
    <Draw way={['A', 'B']} arrow="->" />
    <Draw way={['B', 'C']} arrow="->" />
  </Layout>
);

export default Demo;
