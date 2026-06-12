import { Layout, Node, Path, Step } from '@retikz/react';
import type { FC } from 'react';

const Demo: FC = () => (
  <Layout width={360} height={240} nodeDefault={{ stroke: 'gray', dashed: true }}>
    <Node id="a" position={[0, 0]}>
      A
    </Node>
    <Node id="b" position={[160, 80]}>
      B
    </Node>
    <Node id="c" position={[80, -60]}>
      C
    </Node>
    {/* 一条 path 混合 line + step：A -|→ B（折角）→ 直线到 C → |-→ A（折角闭回） */}
    <Path stroke="currentColor">
      <Step kind="move" to="a" />
      <Step kind="fold" via="-|" to="b" />
      <Step kind="line" to="c" />
      <Step kind="fold" via="|-" to="a" />
    </Path>
  </Layout>
);

export default Demo;
