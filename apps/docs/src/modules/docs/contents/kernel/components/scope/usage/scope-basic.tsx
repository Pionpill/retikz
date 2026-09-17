import { Draw, Layout, Node, Scope } from '@retikz/react';
import type { FC } from 'react';

/** 对照 Scope 内外相同局部 x 坐标的平移结果 */
const Demo: FC = () => (
  <Layout>
    <Node id="origin" position={[0, 0]}>
      x = 0
    </Node>
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
