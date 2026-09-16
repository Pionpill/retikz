import { Draw, Layout, Node, Scope } from '@retikz/react';
import type { FC } from 'react';

/** Move a connected pair without changing child coordinates */
const Demo: FC = () => (
  <Layout viewBox={{ x: -40, y: -45, width: 280, height: 90 }}>
    <Scope transforms={[{ kind: 'translate', x: 80, y: 0 }]}>
      <Node id="A" position={[0, 0]}>
        A
      </Node>
      <Node id="B" position={[100, 0]}>
        B
      </Node>
      <Draw way={['A', 'B']} arrow="->" />
    </Scope>
  </Layout>
);

export default Demo;
