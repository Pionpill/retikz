import { Layout, Node, Path, Scope, Step } from '@retikz/react';
import type { FC } from 'react';

/**
 * 嵌套 localNamespace + inside-out lookup：内层 path 向外看到中层 / 根 frame
 * @description root-anchor 在原点；外层 `<Scope localNamespace>` 在 translate(180, 0)、内含 L1-node；再嵌套一层 `<Scope localNamespace>` 在 translate(180, 0)、内含 L2-node。最内层 path 三次 line 分别引用 'L2-node' / 'L1-node' / 'root-anchor'——栈式 lookup 内层 → 中层 → 根 frame 各命中一次，演示跨 frame shadowing 不阻断外层 id 的可见性。
 */
const Demo: FC = () => (
  <Layout width={600} height={140}>
    <Node id="root-anchor" position={[0, 0]} shape="circle" padding={4}>root</Node>
    <Scope localNamespace transforms={[{ kind: 'translate', x: 180, y: 0 }]}>
      <Node id="L1-node" position={[0, 0]} shape="circle" padding={4}>L1</Node>
      <Scope localNamespace transforms={[{ kind: 'translate', x: 180, y: 0 }]}>
        <Node id="L2-node" position={[0, 0]} shape="circle" padding={4}>L2</Node>
        <Path arrow="->">
          <Step kind="move" to="L2-node" />
          <Step to="L1-node" />
          <Step to="root-anchor" />
        </Path>
      </Scope>
    </Scope>
  </Layout>
);

export default Demo;
