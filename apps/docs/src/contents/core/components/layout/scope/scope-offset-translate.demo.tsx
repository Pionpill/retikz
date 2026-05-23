import { Layout, Node, Scope } from '@retikz/react';
import type { FC } from 'react';

/**
 * 偏移平移：scope 原点对齐到 referent + 任意 (dx, dy)
 * @description A 在原点，scope 用 `offset-translate { of: 'A', offset: [160, 0] }` 整体偏移；组内 p / q / r 三节点视觉上从 A + (160, 0) 起算横向排开。
 */
const Demo: FC = () => (
  <Layout width={560} height={120}>
    <Node id="A" position={[0, 0]}>A</Node>
    <Scope transforms={[{ kind: 'offset-translate', of: 'A', offset: [160, 0] }]}>
      <Node position={[0, 0]} shape="circle">p</Node>
      <Node position={[70, 0]} shape="circle">q</Node>
      <Node position={[140, 0]} shape="circle">r</Node>
    </Scope>
  </Layout>
);

export default Demo;
