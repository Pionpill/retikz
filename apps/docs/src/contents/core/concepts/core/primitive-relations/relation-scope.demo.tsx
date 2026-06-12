import { Draw, Layout, Node, Scope } from '@retikz/react';
import type { FC } from 'react';

/**
 * 组连接：引用 Scope 的合成边界
 * @description 右侧 `<Scope id="cluster">` 把 3 个节点的视觉外接框注册成一个可引用边界。
 *   外部 path 用纯 'cluster'（auto，贴到朝 ext 一侧的 bbox 边）与 'cluster.north'（锁定到 bbox 上边中点），
 *   端点落在整组的边界上，而不是某个单独节点。
 */
const Demo: FC = () => (
  <Layout width={520} height={200}>
    <Node id="ext" position={[0, 20]}>ext</Node>
    <Scope id="cluster" transforms={[{ kind: 'translate', x: 240, y: 0 }]}>
      <Node id="A" position={[0, 0]}>a</Node>
      <Node id="B" position={[90, 0]}>b</Node>
      <Node id="C" position={[45, 70]}>c</Node>
    </Scope>
    <Draw way={['ext', 'cluster']} arrow="->" />
    <Draw way={['ext', 'cluster.north']} arrow="->" />
  </Layout>
);

export default Demo;
