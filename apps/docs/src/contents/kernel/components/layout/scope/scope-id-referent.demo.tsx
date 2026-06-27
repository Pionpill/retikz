import { Draw, Layout, Node, Scope } from '@retikz/react';
import type { FC } from 'react';

/**
 * scope.id 作为另一 node 的 referent（at.of / offset.of）
 * @description 左侧 `<Scope id="left-cluster">` 内 2 节点；外部节点 `follower` 通过
 *   `{ direction: 'right', of: 'left-cluster', distance: 200 }` 落到 cluster bbox 中心右 200；
 *   另一节点用 `{ of: 'left-cluster', offset: [0, 120] }` 落到 cluster bbox 中心下方。展示 scope.id 取 bbox 中心作 referent。
 */
const Demo: FC = () => (
  <Layout width={560} height={220}>
    <Scope id="left-cluster" transforms={[{ kind: 'translate', x: 60, y: 30 }]}>
      <Node id="L1" position={[0, 0]}>L1</Node>
      <Node id="L2" position={[60, 40]}>L2</Node>
    </Scope>
    <Node
      id="follower"
      position={{ direction: 'right', of: 'left-cluster', distance: 200 }}
    >
      right-of-cluster
    </Node>
    <Node
      id="below"
      position={{ of: 'left-cluster', offset: [0, 120] }}
    >
      below-cluster
    </Node>
    <Draw way={['left-cluster', 'follower']} arrow="->" />
    <Draw way={['left-cluster', 'below']} arrow="->" />
  </Layout>
);

export default Demo;
