import { Draw, Layout, Node } from '@retikz/react';
import type { FC } from 'react';

/**
 * 多边形节点圆角（连接感知）
 * @description shape params.cornerRadius 给正多边形倒角；连线端点落在 fillet 弧上而非已被磨掉的尖角。
 */
const Demo: FC = () => (
  <Layout width={360} height={170}>
    <Node id="hub" position={[-110, 0]} fill="lightgray">
      hub
    </Node>
    <Node
      id="hex"
      position={[110, 0]}
      shape={{ type: 'polygon', params: { sides: 6, cornerRadius: 10 } }}
      fill="aliceblue"
    >
      hexagon
    </Node>
    <Draw way={['hub', 'hex']} arrow="->" stroke="gray" />
  </Layout>
);

export default Demo;
