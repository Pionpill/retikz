import { Draw, Layout, Node } from '@retikz/react';
import type { FC } from 'react';

/**
 * 星形节点圆角（凸尖 + 凹角都倒，连接感知）
 * @description shape params.cornerRadius 同时磨圆 tip 与 notch；朝 tip-0 方向的连线端点落在 fillet 弧上。
 */
const Demo: FC = () => (
  <Layout width={360} height={180}>
    <Node id="hub" position={[-100, 0]} fill="lightgray">
      hub
    </Node>
    <Node
      id="badge"
      position={[100, 0]}
      shape={{ type: 'star', params: { points: 5, innerRadius: 18, outerRadius: 46, cornerRadius: 6 } }}
      fill="gold"
    />
    <Draw way={['hub', { id: 'badge', anchor: 'tip-0' }]} arrow="->" />
  </Layout>
);

export default Demo;
