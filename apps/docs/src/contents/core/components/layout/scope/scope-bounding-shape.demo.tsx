import { Coordinate, Draw, Layout, Node, Scope } from '@retikz/react';
import type { FC } from 'react';

/**
 * scope.id boundingShape='circle'：synthetic 包络取子树最小外接圆，连线落圆周而非矩形角
 * @description 右侧 `<Scope id="cluster" boundingShape="circle">` 内 3 节点；灰虚线用 12 个角度锚
 *   `cluster.0 … cluster.330` 描出圆形包络；外部两条 path 引用 `cluster.west` / `cluster.north`，
 *   端点贴**圆周**。缺省 / boundingShape="rectangle" 时这些点会落在外接矩形边上。
 */
const RING = [
  'cluster.0', 'cluster.30', 'cluster.60', 'cluster.90', 'cluster.120', 'cluster.150',
  'cluster.180', 'cluster.210', 'cluster.240', 'cluster.270', 'cluster.300', 'cluster.330', 'cluster.0',
];

const Demo: FC = () => (
  <Layout width={560} height={220}>
    <Coordinate id="external" position={[0, 50]} />
    <Scope id="cluster" boundingShape="circle" transforms={[{ kind: 'translate', x: 240, y: 0 }]}>
      <Node id="A" position={[0, 0]}>A</Node>
      <Node id="B" position={[80, 0]}>B</Node>
      <Node id="C" position={[40, 60]}>C</Node>
    </Scope>
    <Draw way={RING} stroke="gray" dashPattern={[4, 3]} />
    <Draw way={['external', 'cluster.west']} arrow="->" />
    <Draw way={['external', 'cluster.north']} arrow="->" />
  </Layout>
);

export default Demo;
