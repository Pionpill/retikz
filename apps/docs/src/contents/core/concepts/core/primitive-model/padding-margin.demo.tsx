import { Draw, Layout, Node, Rectangle } from '@retikz/react';
import type { FC } from 'react';

const Demo: FC = () => (
  <Layout width={520} height={156} viewBox={{ x: -185, y: -70, width: 430, height: 128 }} style={{ maxWidth: '100%', height: 'auto' }}>
    {/* 左：padding —— 内容盒与 shape 之间的内部间距，节点随之变大 */}
    <Rectangle center={[-105, 0]} width={130} height={84} fill="none" stroke="darkorange" />
    <Rectangle center={[-105, 0]} width={56} height={30} fill="lightgray" stroke="none" />
    <Draw way={[[-105, -15], [-105, -42]]} arrow="<->" stroke="gray" />
    <Node id="padding-lbl" position={[-66, -28]} stroke="none" textColor="gray" font={{ size: 12 }}>
      padding
    </Node>
    <Node id="shape-lbl-l" position={[-105, -56]} stroke="none" textColor="darkorange">
      shape
    </Node>

    {/* 右：margin —— shape 边缘与自动连线端点之间的外部间距，节点不变 */}
    <Rectangle center={[105, 0]} width={130} height={84} fill="none" stroke="darkorange" />
    <Draw way={[[232, 0], [202, 0]]} arrow="->" stroke="gray" />
    <Draw way={[[202, 0], [170, 0]]} stroke="lightgray" dashPattern={[4, 3]} />
    <Node id="margin-lbl" position={[186, -16]} stroke="none" textColor="gray" font={{ size: 12 }}>
      margin
    </Node>
    <Node id="shape-lbl-r" position={[105, -56]} stroke="none" textColor="darkorange">
      shape
    </Node>
  </Layout>
);

export default Demo;
