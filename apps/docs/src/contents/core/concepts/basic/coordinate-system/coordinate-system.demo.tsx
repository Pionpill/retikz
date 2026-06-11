import { Coordinate, Draw, Layout, Node } from '@retikz/react';
import type { FC } from 'react';

const Demo: FC = () => (
  <Layout width={430} height={230} viewBox={{ x: -40, y: -45, width: 260, height: 170 }} style={{ maxWidth: '100%', height: 'auto' }}>
    <Coordinate id="O" position={[0, 0]} />
    <Coordinate id="X" position={[160, 0]} />
    <Coordinate id="Y" position={[0, 105]} />

    <Node id="origin-label" position={{ of: [0, 0], offset: [28, -18] }} stroke="none" textColor="gray">
      [0, 0]
    </Node>
    <Node id="x-label" position={{ of: [160, 0], offset: [-12, -18] }} stroke="none" textColor="gray">
      +x
    </Node>
    <Node id="y-label" position={{ of: [0, 105], offset: [24, -8] }} stroke="none" textColor="gray">
      +y
    </Node>

    <Node id="p" position={[120, 70]} shape="circle" minimumSize={6} padding={0} fill="currentColor" stroke="none" />
    <Node id="p-label" position={{ of: [120, 70], offset: [42, -16] }} stroke="none">
      [120, 70]
    </Node>

    <Draw way={['O', 'X']} arrow="->" stroke="gray" />
    <Draw way={['O', 'Y']} arrow="->" stroke="gray" />
    <Draw way={[[120, 0], [120, 70]]} stroke="lightgray" dashPattern={[4, 3]} />
    <Draw way={[[0, 70], [120, 70]]} stroke="lightgray" dashPattern={[4, 3]} />
  </Layout>
);

export default Demo;
