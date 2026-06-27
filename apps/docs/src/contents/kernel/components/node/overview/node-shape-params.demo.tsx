import { Draw, Layout, Node } from '@retikz/react';
import type { FC } from 'react';

/**
 * params 驱动的带参 shape
 * @description sector / star / arc 用 shape={{ type, params }}：尺寸由半径参数定、不依赖文本，仍是可连接图元。
 *   path 端点贴各自的自定义 anchor（sector 的 outer-arc-mid、star 的 tip-0），中央 hub 连向它们。
 */
const Demo: FC = () => (
  <Layout width={420} height={240}>
    <Node id="hub" position={[0, 0]} fill="lightgray">
      hub
    </Node>
    <Node
      id="wedge"
      position={[-140, -60]}
      shape={{ type: 'sector', params: { innerRadius: 18, outerRadius: 50, startAngle: 0, endAngle: 110 } }}
      fill="darkorange"
    />
    <Node
      id="badge"
      position={[140, -60]}
      shape={{ type: 'star', params: { points: 5, innerRadius: 16, outerRadius: 40 } }}
      fill="gold"
    />
    <Node
      id="curve"
      position={[0, 90]}
      shape={{ type: 'arc', params: { radius: 48, startAngle: 20, endAngle: 160 } }}
    />
    <Draw way={[{ id: 'wedge', anchor: 'outer-arc-mid' }, 'hub']} arrow="->" stroke="gray" />
    <Draw way={[{ id: 'badge', anchor: 'tip-0' }, 'hub']} arrow="->" stroke="gray" />
    <Draw way={['hub', 'curve']} arrow="->" stroke="gray" />
  </Layout>
);

export default Demo;
