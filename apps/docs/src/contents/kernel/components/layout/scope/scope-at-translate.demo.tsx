import { Layout, Node, Scope } from '@retikz/react';
import type { FC } from 'react';

/**
 * 方向相对平移：scope 整体落到 referent 节点的某方向 distance 处
 * @description 锚 A 在原点，scope 用 `at-translate { direction: 'right', of: 'A', distance: 160 }`，组内 x / y / z 三节点视觉上整体出现在 A 右边 160；语义镜像 `<Node position={{ direction, of, distance }}>`，但作用到一组节点。
 */
const Demo: FC = () => (
  <Layout width={560} height={120}>
    <Node id="A" position={[0, 0]}>A</Node>
    <Scope transforms={[{ kind: 'at-translate', direction: 'right', of: 'A', distance: 160 }]}>
      <Node id="x" position={[0, 0]}>x</Node>
      <Node id="y" position={[70, 0]}>y</Node>
      <Node id="z" position={[140, 0]}>z</Node>
    </Scope>
  </Layout>
);

export default Demo;
