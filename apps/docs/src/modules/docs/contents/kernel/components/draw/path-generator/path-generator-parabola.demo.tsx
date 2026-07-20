import type { FC } from 'react';

import { Layout, Node, Path, Step } from '@retikz/react';

const Demo: FC = () => (
  <Layout width={420} height={180} viewBox={{ x: -210, y: -90, width: 420, height: 180 }}>
    <Node id="A" position={[-160, 48]} shape="circle" fill="#f8fafc">
      A
    </Node>
    <Node id="B" position={[160, 48]} shape="circle" fill="#f8fafc">
      B
    </Node>
    <Node id="C" position={[0, -58]} shape="circle" fill="#fff7ed" stroke="#fb923c">
      C
    </Node>

    <Path stroke="#94a3b8" dashPattern={[1, 4]} lineCap="round" strokeWidth={1}>
      <Step kind="move" to="A" />
      <Step kind="line" to="C" />
      <Step kind="line" to="B" />
    </Path>

    <Path stroke="#ea580c" strokeWidth={2.4} arrow="->">
      <Step kind="move" to="A" />
      <Step kind="generator" name="parabola" to="B" params={{ control: { id: 'C' } }} label={{ text: 'parabola' }} />
    </Path>
  </Layout>
);

export default Demo;
