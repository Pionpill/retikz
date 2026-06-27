import { Draw, Layout, Node } from '@retikz/react';
import type { FC } from 'react';

/**
 * 星形节点圆角（凸尖 + 凹角都倒，连接感知贴边）
 * @description shape params.cornerRadius 同时磨圆 tip 与 notch；不写 anchor 的自动贴边连线朝 tip 逼近时，
 *   端点落在 fillet 弧上、停在被磨圆的尖角之前，而不是原始尖尖（显式命名锚点 tip-N 才恒在原始尖角）。
 */
const Demo: FC = () => (
  <Layout width={280} height={240}>
    <Node id="hub" position={[0, -88]} fill="lightgray">
      hub
    </Node>
    <Node
      id="badge"
      position={[0, 35]}
      shape={{ type: 'star', params: { points: 5, innerRadius: 20, outerRadius: 52, cornerRadius: 10 } }}
      fill="gold"
    />
    <Draw way={['hub', 'badge']} arrow="->" stroke="gray" />
  </Layout>
);

export default Demo;
