import { Draw, DrawWay, Layout, Node, Scope } from '@retikz/react';
import type { FC } from 'react';

/**
 * 分组连接：引用 Scope 的合成边界
 * @description `<Scope id="cluster">` 把 3 个节点的视觉外接框注册成可引用边界（淡灰虚线用 4 个角锚点连出）。
 *   外部 ext 用纯 `'cluster'`（auto，贴到朝它一侧的边）与 `'cluster.north'`（锁定到上边中点）连接整组。
 */
const Demo: FC = () => (
  <Layout width={440} height={150}>
    <Node id="ext" position={[-170, 0]} stroke="none">ext</Node>
    <Scope id="cluster" transforms={[{ kind: 'translate', x: 90, y: 0 }]}>
      <Node id="A" position={[0, -20]} stroke="none">a</Node>
      <Node id="B" position={[70, -20]} stroke="none">b</Node>
      <Node id="C" position={[35, 30]} stroke="none">c</Node>
    </Scope>
    {/* cluster 合成外接框：4 个角锚点连成轮廓，纯示意 */}
    <Draw way={['cluster.north-west', 'cluster.north-east', 'cluster.south-east', 'cluster.south-west', DrawWay.Cycle]} stroke="lightgray" dashPattern={[4, 3]} />
    <Draw way={['ext', { label: { text: 'cluster', side: 'below', textColor: 'gray', font: { size: 12 } } }, 'cluster']} arrow="->" />
    <Draw way={['ext', { label: { text: 'cluster.north', side: 'above', textColor: 'gray', font: { size: 12 } } }, 'cluster.north']} arrow="->" />
  </Layout>
);

export default Demo;
